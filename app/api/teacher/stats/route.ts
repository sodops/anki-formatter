import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/stats — Get comprehensive teacher statistics
 * Returns: group analytics, student engagement, top students, completion rates
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`teacher-stats:${ip}`, { limit: 20, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify teacher role
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Not a teacher" }, { status: 403 });
    }

    // Get teacher's groups
    const { data: groups } = await admin
      .from("groups")
      .select("id, name, color")
      .eq("owner_id", user.id);

    const groupIds = (groups || []).map(g => g.id);

    if (groupIds.length === 0) {
      return NextResponse.json({
        groups: [],
        students: [],
        top_students: [],
        group_stats: [],
        overall: { total_students: 0, total_assignments: 0, avg_accuracy: 0, avg_completion: 0, total_reviews: 0 },
      });
    }

    // Get all assignments for teacher's groups
    const { data: assignments } = await admin
      .from("assignments")
      .select("id, title, group_id, xp_reward, status, created_at")
      .in("group_id", groupIds);

    const assignmentIds = (assignments || []).map(a => a.id);

    // Get all student progress
    const { data: allProgress } = await admin
      .from("student_progress")
      .select("*")
      .in("assignment_id", assignmentIds.length > 0 ? assignmentIds : ["none"]);

    // Get all group members (students)
    const { data: members } = await admin
      .from("group_members")
      .select("user_id, group_id, joined_at")
      .in("group_id", groupIds)
      .neq("user_id", user.id);

    // Get student profiles
    const studentIds = [...new Set((members || []).map(m => m.user_id))];
    let studentProfiles: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp, current_streak")
        .in("id", studentIds);

      for (const p of profiles || []) {
        studentProfiles[p.id] = p;
      }
    }

    // Calculate per-group stats
    const groupStats = (groups || []).map(g => {
      const groupMembers = (members || []).filter(m => m.group_id === g.id);
      const groupAssignments = (assignments || []).filter(a => a.group_id === g.id);
      const groupAssignmentIds = groupAssignments.map(a => a.id);
      const groupProgress = (allProgress || []).filter(p => groupAssignmentIds.includes(p.assignment_id));

      const completedCount = groupProgress.filter(p => p.status === "completed").length;
      const totalProgressEntries = groupProgress.length || 1;
      const avgAccuracy = groupProgress.length > 0
        ? Math.round(groupProgress.reduce((s, p) => s + (p.accuracy || 0), 0) / groupProgress.length)
        : 0;
      const totalReviews = groupProgress.reduce((s, p) => s + (p.total_reviews || 0), 0);
      const completionRate = Math.round((completedCount / totalProgressEntries) * 100);

      return {
        id: g.id,
        name: g.name,
        color: g.color,
        member_count: groupMembers.length,
        assignment_count: groupAssignments.length,
        completed_count: completedCount,
        completion_rate: completionRate,
        avg_accuracy: avgAccuracy,
        total_reviews: totalReviews,
      };
    });

    // Calculate per-student stats
    const studentStats = studentIds.map(sid => {
      const profile = studentProfiles[sid];
      const studentProgress = (allProgress || []).filter(p => p.student_id === sid);
      const completedTasks = studentProgress.filter(p => p.status === "completed").length;
      const totalTasks = studentProgress.length;
      const avgAccuracy = studentProgress.length > 0
        ? Math.round(studentProgress.reduce((s, p) => s + (p.accuracy || 0), 0) / studentProgress.length)
        : 0;
      const totalXPEarned = studentProgress.reduce((s, p) => s + (p.xp_earned || 0), 0);
      const totalReviews = studentProgress.reduce((s, p) => s + (p.total_reviews || 0), 0);
      const totalTime = studentProgress.reduce((s, p) => s + (p.time_spent_seconds || 0), 0);
      const studentGroups = (members || []).filter(m => m.user_id === sid).map(m => m.group_id);

      return {
        id: sid,
        name: profile?.display_name || "Unknown",
        avatar_url: profile?.avatar_url,
        total_xp: profile?.total_xp || 0,
        current_streak: profile?.current_streak || 0,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        avg_accuracy: avgAccuracy,
        total_reviews: totalReviews,
        total_time_seconds: totalTime,
        xp_earned: totalXPEarned,
        groups: studentGroups,
      };
    });

    // Top students by XP
    const topStudents = [...studentStats].sort((a, b) => b.total_xp - a.total_xp).slice(0, 10);

    // Overall stats
    const overallCompleted = (allProgress || []).filter(p => p.status === "completed").length;
    const overallTotal = (allProgress || []).length || 1;
    const overallAvgAccuracy = (allProgress || []).length > 0
      ? Math.round((allProgress || []).reduce((s, p) => s + (p.accuracy || 0), 0) / (allProgress || []).length)
      : 0;

    return NextResponse.json({
      groups: groups || [],
      group_stats: groupStats,
      students: studentStats,
      top_students: topStudents,
      overall: {
        total_students: studentIds.length,
        total_assignments: (assignments || []).length,
        total_completed: overallCompleted,
        completion_rate: Math.round((overallCompleted / overallTotal) * 100),
        avg_accuracy: overallAvgAccuracy,
        total_reviews: (allProgress || []).reduce((s, p) => s + (p.total_reviews || 0), 0),
      },
    });
  } catch (error) {
    console.error("GET /api/teacher/stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
