export interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  join_code: string;
  max_members: number;
  member_count: number;
  assignment_count: number;
  created_at: string;
}

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
  created_at: string;
  progress_summary?: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    avg_accuracy: number;
  };
}

export interface Deck {
  id: string;
  name: string;
  cards_count?: number;
}

export const COLORS = [
  "#7C5CFC",
  "#9B7FFF",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
];
