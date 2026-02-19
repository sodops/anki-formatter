import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/groups/[id]/members/[userId] — Remove member or leave group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: groupId, userId: targetUserId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check if it's the group owner or the user themselves
    const { data: group } = await admin
      .from("groups")
      .select("owner_id, name")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isOwner = group.owner_id === user.id;
    const isSelf = targetUserId === user.id;

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Owner can't leave their own group (must delete it instead)
    if (isSelf && isOwner) {
      return NextResponse.json({ error: "Group owner cannot leave. Delete the group instead." }, { status: 400 });
    }

    // Get member name before removal
    const { data: memberProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", targetUserId)
      .single();

    // Remove member
    const { error } = await admin
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);

    if (error) throw error;

    // Clean up student progress for this group's assignments
    const { data: groupAssignments } = await admin
      .from("assignments")
      .select("id")
      .eq("group_id", groupId);

    if (groupAssignments?.length) {
      const assignmentIds = groupAssignments.map(a => a.id);
      await admin
        .from("student_progress")
        .delete()
        .in("assignment_id", assignmentIds)
        .eq("student_id", targetUserId);
    }

    // Notify the group owner
    if (!isOwner || !isSelf) {
      const memberName = memberProfile?.display_name || "A member";
      await admin.from("notifications").insert({
        user_id: group.owner_id,
        type: "group_invite",
        title: isSelf ? "Member left" : "Member removed",
        message: isSelf
          ? `${memberName} left ${group.name}`
          : `${memberName} was removed from ${group.name}`,
        data: { group_id: groupId, user_id: targetUserId },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id]/members/[userId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
