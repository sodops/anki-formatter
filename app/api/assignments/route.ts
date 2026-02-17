import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * GET /api/assignments — List assignments
 * Teachers: assignments they created
 * Students: assignments for their groups
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`assignments-get:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "student";
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id");

    if (role === "teacher" || role === "admin") {
      // Teacher: get assignments they created
      let query = supabase
        .from("assignments")
        .select(`
          *,
          assignment_decks(id, deck_name, card_count, source_deck_id),
          groups(id, name, color)
        `)
        .eq("teacher_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (groupId) query = query.eq("group_id", groupId);

      const { data: assignments, error } = await query;
      if (error) throw error;

      // Get progress summary for each assignment
      const assignmentIds = (assignments || []).map(a => a.id);
      let progressSummary: Record<string, { total: number; completed: number; in_progress: number; pending: number; avg_accuracy: number }> = {};

      if (assignmentIds.length > 0) {
        const { data: progress } = await supabase
          .from("student_progress")
          .select("assignment_id, status, accuracy")
          .in("assignment_id", assignmentIds);

        if (progress) {
          for (const p of progress) {
            if (!progressSummary[p.assignment_id]) {
              progressSummary[p.assignment_id] = { total: 0, completed: 0, in_progress: 0, pending: 0, avg_accuracy: 0 };
            }
            const s = progressSummary[p.assignment_id];
            s.total++;
            if (p.status === "completed") s.completed++;
            else if (p.status === "in_progress") s.in_progress++;
            else s.pending++;
            s.avg_accuracy += p.accuracy || 0;
          }
          // Compute averages
          for (const key of Object.keys(progressSummary)) {
            const s = progressSummary[key];
            if (s.total > 0) s.avg_accuracy = Math.round(s.avg_accuracy / s.total);
          }
        }
      }

      return NextResponse.json({
        assignments: (assignments || []).map(a => ({
          ...a,
          progress_summary: progressSummary[a.id] || { total: 0, completed: 0, in_progress: 0, pending: 0, avg_accuracy: 0 },
        })),
        role,
      });
    } else {
      // Student: get assignments from their groups with their progress
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const groupIds = (memberships || []).map(m => m.group_id);
      if (groupIds.length === 0) {
        return NextResponse.json({ assignments: [], role });
      }

      let query = supabase
        .from("assignments")
        .select(`
          *,
          assignment_decks(id, deck_name, card_count, source_deck_id),
          groups(id, name, color)
        `)
        .in("group_id", groupIds)
        .eq("is_active", true)
        .order("deadline", { ascending: true, nullsFirst: false });

      if (groupId) query = query.eq("group_id", groupId);

      const { data: assignments, error } = await query;
      if (error) throw error;

      // Get student's progress for these assignments
      const assignmentIds = (assignments || []).map(a => a.id);
      let progressMap: Record<string, DB.StudentProgress> = {};

      if (assignmentIds.length > 0) {
        const { data: progress } = await supabase
          .from("student_progress")
          .select("*")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds);

        if (progress) {
          for (const p of progress) {
            progressMap[p.assignment_id] = p as DB.StudentProgress;
          }
        }
      }

      return NextResponse.json({
        assignments: (assignments || []).map(a => ({
          ...a,
          my_progress: progressMap[a.id] || null,
        })),
        role,
      });
    }
  } catch (error: any) {
    console.error("GET /api/assignments error:", error?.message || error);
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      return NextResponse.json({ assignments: [], role: 'student' });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/assignments
 * Body: { group_id, title, description, deadline, xp_reward, deck_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`assignments-post:${ip}`, { limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify teacher role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "teacher" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Only teachers can create assignments" }, { status: 403 });
    }

    const body = await request.json();
    const { group_id, title, description, deadline, xp_reward, deck_ids } = body;

    if (!group_id || !title?.trim()) {
      return NextResponse.json({ error: "Group and title are required" }, { status: 400 });
    }

    if (!deck_ids?.length) {
      return NextResponse.json({ error: "At least one deck is required" }, { status: 400 });
    }

    // Verify teacher owns the group
    const { data: group } = await supabase
      .from("groups")
      .select("id, owner_id")
      .eq("id", group_id)
      .single();

    if (!group || group.owner_id !== user.id) {
      return NextResponse.json({ error: "You don't own this group" }, { status: 403 });
    }

    // Create the assignment
    const { data: assignment, error: assignError } = await supabase
      .from("assignments")
      .insert({
        group_id,
        teacher_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadline || null,
        xp_reward: xp_reward || 10,
      })
      .select()
      .single();

    if (assignError) throw assignError;

    // Get source decks info
    const { data: sourceDekcs } = await supabase
      .from("decks")
      .select("id, name")
      .in("id", deck_ids)
      .eq("user_id", user.id);

    // Count cards per deck
    const deckCards: Record<string, number> = {};
    for (const deckId of deck_ids) {
      const { count } = await supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("deck_id", deckId)
        .eq("is_deleted", false);
      deckCards[deckId] = count || 0;
    }

    // Create assignment_decks entries
    const assignmentDecks = (sourceDekcs || []).map(d => ({
      assignment_id: assignment.id,
      source_deck_id: d.id,
      deck_name: d.name,
      card_count: deckCards[d.id] || 0,
    }));

    if (assignmentDecks.length > 0) {
      await supabase.from("assignment_decks").insert(assignmentDecks);
    }

    // Create student_progress for all students in the group
    const { data: students } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", group_id)
      .eq("role", "student");

    if (students?.length) {
      const totalCards = Object.values(deckCards).reduce((sum, c) => sum + c, 0);
      const progressRecords = students.map(s => ({
        assignment_id: assignment.id,
        student_id: s.user_id,
        status: "pending" as const,
        cards_total: totalCards,
      }));

      await supabase.from("student_progress").insert(progressRecords);

      // Notify all students
      const notifications = students.map(s => ({
        user_id: s.user_id,
        type: "assignment_new" as const,
        title: "New Assignment",
        message: `"${title.trim()}" has been assigned${deadline ? ` — due ${new Date(deadline).toLocaleDateString()}` : ""}`,
        data: { assignment_id: assignment.id, group_id },
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/assignments error:", error?.message || error);
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      return NextResponse.json({ error: "Assignments feature is not yet configured. Please run the database migration." }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
