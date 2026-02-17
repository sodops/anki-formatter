declare namespace React.JSX {
  interface IntrinsicElements {
    "ion-icon": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { name?: string; class?: string },
      HTMLElement
    >;
  }
}

// Database types for the teacher-student platform
declare namespace DB {
  type UserRole = "student" | "teacher" | "admin";

  interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Group {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    join_code: string;
    color: string;
    max_members: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  interface GroupMember {
    id: string;
    group_id: string;
    user_id: string;
    role: "student" | "teacher";
    joined_at: string;
  }

  interface Assignment {
    id: string;
    group_id: string;
    teacher_id: string;
    title: string;
    description: string | null;
    deadline: string | null;
    xp_reward: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  interface AssignmentDeck {
    id: string;
    assignment_id: string;
    source_deck_id: string | null;
    deck_name: string;
    card_count: number;
    created_at: string;
  }

  interface StudentProgress {
    id: string;
    assignment_id: string;
    student_id: string;
    status: "pending" | "in_progress" | "completed" | "overdue";
    cards_total: number;
    cards_studied: number;
    cards_mastered: number;
    accuracy: number;
    total_reviews: number;
    time_spent_seconds: number;
    started_at: string | null;
    completed_at: string | null;
    last_studied_at: string | null;
    xp_earned: number;
    created_at: string;
    updated_at: string;
  }

  interface XPEvent {
    id: string;
    user_id: string;
    event_type: "review" | "assignment_complete" | "streak_bonus" | "perfect_score" | "daily_goal" | "first_review";
    xp_amount: number;
    source_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }

  interface Notification {
    id: string;
    user_id: string;
    type: "assignment_new" | "assignment_deadline" | "assignment_graded" | "group_invite" | "xp_earned" | "streak_milestone" | "system";
    title: string;
    message: string | null;
    data: Record<string, unknown>;
    is_read: boolean;
    created_at: string;
  }
}
