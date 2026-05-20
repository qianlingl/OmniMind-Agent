export interface Session {
  session_id: string;
  created_at: string;
  last_active?: string;
  message_count: number;
}

export interface Message {
  role: string;
  content: string;
  timestamp: string;
}

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  summary: string;
  published_at?: string;
}

export interface MemoryItem {
  memory_id: string;
  type: string;
  content: string;
  similarity?: number;
}

export interface TaskItem {
  task_id: string;
  status: string;
  progress: number;
  sub_tasks: { name: string; status: string }[];
  results?: Record<string, string>;
}

export interface LearningGoal {
  goal_id: string;
  title: string;
  status: string;
  progress_pct: number;
  streak_days: number;
  created_at?: string;
}

export interface LearningTask {
  task_id: string;
  title: string;
  type: string;
  duration_min: number;
  status: string;
  order: number;
}

export interface QuizQuestion {
  question_id: string;
  type: string;
  content: string;
  expected_concepts: string[];
}

export interface Flashcard {
  flashcard_id: string;
  front: string;
  back: string;
  tags: string[];
  concept?: string;
  mastery: number;
  reviews_count: number;
  next_review_at?: string | null;
}

export interface ReviewItem {
  review_id: string;
  concept: string;
  mastery: number;
  interval_days: number;
  status: string;
}

export interface LearningReport {
  goal_id: string;
  period: string;
  stats: Record<string, number>;
  mastery_by_topic: { topic: string; mastery: number }[];
  weak_points: string[];
  study_calendar: { date: string; minutes: number; tasks: number }[];
}
