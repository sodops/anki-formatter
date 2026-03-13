export interface DashboardStats {
  users: { total: number; active: number; new: number };
  decks: { total: number; created_today: number };
  cards: { total: number; created_today: number };
  reviews: { total: number; today: number };
  webVitals: { count: number; avgLCP: number };
}

export interface CardStates {
  new: number;
  learning: number;
  review: number;
  relearning: number;
}

export interface TodayGrades {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface RecentDeck {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  lastSignIn: string | null;
  createdAt: string | null;
}

export interface ActivityItem {
  id: string;
  type: "user_signup" | "deck_created" | "cards_added" | "review_session" | "error";
  user: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

export interface MetricSummary {
  name: string;
  count: number;
  avg: number;
  median: number;
  p75: number;
  p95: number;
  min: number;
  max: number;
  rating: { good: number; needsImprovement: number; poor: number };
}

export type Tab = "overview" | "users" | "content" | "analytics" | "vitals" | "api" | "system";
