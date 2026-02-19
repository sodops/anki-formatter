import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections — Get current user's connections
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`connections:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get all connections (accepted + pending)
    const { data: connections } = await admin
      .from("connections")
      .select("id, requester_id, target_id, status, created_at")
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!connections || connections.length === 0) {
      return NextResponse.json({ connections: [], pending_requests: [] });
    }

    // Get all related user IDs
    const userIds = new Set<string>();
    connections.forEach(c => {
      if (c.requester_id !== user.id) userIds.add(c.requester_id);
      if (c.target_id !== user.id) userIds.add(c.target_id);
    });

    // Fetch profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url, username, nickname, role, total_xp, current_streak")
      .in("id", Array.from(userIds));

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const accepted = connections
      .filter(c => c.status === "accepted")
      .map(c => {
        const otherId = c.requester_id === user.id ? c.target_id : c.requester_id;
        return {
          connection_id: c.id,
          user: profileMap[otherId] || { id: otherId, display_name: "Unknown" },
          since: c.created_at,
        };
      });

    const pendingRequests = connections
      .filter(c => c.status === "pending" && c.target_id === user.id)
      .map(c => ({
        connection_id: c.id,
        user: profileMap[c.requester_id] || { id: c.requester_id, display_name: "Unknown" },
        created_at: c.created_at,
      }));

    const sentRequests = connections
      .filter(c => c.status === "pending" && c.requester_id === user.id)
      .map(c => ({
        connection_id: c.id,
        user: profileMap[c.target_id] || { id: c.target_id, display_name: "Unknown" },
        created_at: c.created_at,
      }));

    return NextResponse.json({
      connections: accepted,
      pending_requests: pendingRequests,
      sent_requests: sentRequests,
    });
  } catch (error) {
    console.error("GET /api/connections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/connections — Send a connection request
 * Body: { target_id }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`connect:${ip}`, { limit: 20, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const targetId = body.target_id;

    if (!targetId || targetId === user.id) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check if connection already exists
    const { data: existing } = await admin
      .from("connections")
      .select("id, status")
      .or(`and(requester_id.eq.${user.id},target_id.eq.${targetId}),and(requester_id.eq.${targetId},target_id.eq.${user.id})`)
      .limit(1)
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Already connected" }, { status: 400 });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Request already pending" }, { status: 400 });
      }
      // If rejected, allow re-request by updating
      const { error: updateError } = await admin
        .from("connections")
        .update({ status: "pending", requester_id: user.id, target_id: targetId, created_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updateError) throw updateError;
      return NextResponse.json({ status: "pending", message: "Connection request sent" });
    }

    // Create new connection request
    const { error: insertError } = await admin
      .from("connections")
      .insert({
        requester_id: user.id,
        target_id: targetId,
        status: "pending",
      });

    if (insertError) throw insertError;

    // Send notification to target
    try {
      const { data: requesterProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      await admin.from("notifications").insert({
        user_id: targetId,
        type: "connection_request",
        title: "New Connection Request",
        message: `${requesterProfile?.display_name || "Someone"} wants to connect with you`,
        data: { requester_id: user.id },
      });
    } catch {
      // Notification is non-critical
    }

    return NextResponse.json({ status: "pending", message: "Connection request sent" });
  } catch (error) {
    console.error("POST /api/connections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/connections — Accept or reject a connection request
 * Body: { connection_id, action: "accept" | "reject" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connection_id, action } = body;

    if (!connection_id || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get the connection and verify the user is the target
    const { data: conn } = await admin
      .from("connections")
      .select("*")
      .eq("id", connection_id)
      .eq("target_id", user.id)
      .eq("status", "pending")
      .single();

    if (!conn) {
      return NextResponse.json({ error: "Connection request not found" }, { status: 404 });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    const { error: updateError } = await admin
      .from("connections")
      .update({ status: newStatus })
      .eq("id", connection_id);

    if (updateError) throw updateError;

    // Notify the requester
    if (action === "accept") {
      try {
        const { data: accepterProfile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        await admin.from("notifications").insert({
          user_id: conn.requester_id,
          type: "connection_accepted",
          title: "Connection Accepted",
          message: `${accepterProfile?.display_name || "Someone"} accepted your connection request`,
          data: { user_id: user.id },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ status: newStatus });
  } catch (error) {
    console.error("PATCH /api/connections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/connections — Remove a connection
 * Body: { connection_id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("id");

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify user is part of the connection
    const { data: conn } = await admin
      .from("connections")
      .select("id")
      .eq("id", connectionId)
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      .single();

    if (!conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const { error: deleteError } = await admin
      .from("connections")
      .delete()
      .eq("id", connectionId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/connections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
