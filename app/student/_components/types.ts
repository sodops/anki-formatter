export interface Assignment {
  id: string;
  title: string;
  description: string;
  group_id: string;
  group_name?: string;
  group_color?: string;
  deadline: string | null;
  xp_reward: number;
  status: string;
  my_progress?: {
    status: string;
    cards_studied: number;
    cards_mastered: number;
    cards_total: number;
    accuracy: number;
    total_reviews: number;
    time_spent_seconds: number;
    xp_earned: number;
  };
  assignment_decks?: { deck_id: string; deck_name: string }[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  member_count: number;
  assignment_count: number;
  joined_at: string;
  is_owner?: boolean;
  owner_id?: string;
}

export interface XPData {
  total_xp: number;
  today_xp: number;
  level: number;
  xp_to_next: number;
  current_streak: number;
  longest_streak: number;
  recent_events: { event_type: string; xp_amount: number; created_at: string }[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export type StudentTab =
  | "dashboard"
  | "assignments"
  | "groups"
  | "inbox"
  | "profile"
  | "settings";
