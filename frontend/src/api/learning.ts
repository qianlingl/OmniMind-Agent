import { api } from './client';

export async function createGoal(data: {
  title: string; subject?: string; topic?: string; level?: string;
  daily_minutes?: number; duration_weeks?: number; available_days?: string[]; notes?: string;
}) {
  return api.post('/learning/goals', data);
}

export async function listGoals() {
  return api.get<{ goals: Array<{ goal_id: string; title: string; status: string; progress_pct: number; streak_days: number; created_at: string }> }>('/learning/goals');
}

export async function getGoal(goalId: string) {
  return api.get(`/learning/goals/${goalId}`);
}

export async function getTodayTasks(goalId: string) {
  return api.get<{ date: string; tasks: Array<{ task_id: string; title: string; type: string; duration_min: number; status: string; order: number }>; total_minutes: number }>(`/learning/goals/${goalId}/tasks/today`);
}

export async function updateTask(taskId: string, status: string, actualDurationMin?: number) {
  return api.patch(`/learning/tasks/${taskId}`, { status, actual_duration_min: actualDurationMin });
}

export async function startQuiz(goalId: string, topic?: string, questionCount = 3) {
  return api.post<{ quiz_id: string; questions: Array<{ question_id: string; type: string; content: string; expected_concepts: string[] }> }>(
    `/learning/goals/${goalId}/quiz/start`,
    { topic, question_count: questionCount }
  );
}

export async function submitAnswer(quizId: string, questionId: string, answer: string) {
  return api.post<{ question_id: string; score: number; max_score: number; feedback: string; missing_concepts: string[]; weak_points: Array<{ concept: string; mastery: number }>; next_review_at: string }>(
    `/learning/quiz/${quizId}/answer`,
    { question_id: questionId, answer }
  );
}

export async function getReviews(goalId: string) {
  return api.get<{ due_reviews: Array<{ review_id: string; concept: string; mastery: number; interval_days: number; status: string }>; total_due: number }>(`/learning/goals/${goalId}/reviews`);
}

export async function submitReviewFeedback(reviewId: string, quality: number) {
  return api.post<{ review_id: string; concept: string; new_interval_days: number; next_review_at: string; easiness: number }>(
    `/learning/reviews/${reviewId}/feedback`,
    { quality }
  );
}

export async function submitFlashcardFeedback(flashcardId: string, quality: number) {
  return api.post<{ review_id: string; concept: string; new_interval_days: number; next_review_at: string; easiness: number }>(
    `/learning/flashcards/${flashcardId}/feedback`,
    { quality }
  );
}

export async function generateFlashcards(goalId: string, file: File | null, text: string | null, count = 10) {
  const fd = new FormData();
  if (file) fd.append('file', file);
  if (text) fd.append('text', text);
  fd.append('flashcard_count', String(count));
  return api.uploadFormData(`/learning/goals/${goalId}/flashcards/generate`, fd);
}

export async function listFlashcards(goalId: string, status?: string, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.append('status', status);
  return api.get(`/learning/goals/${goalId}/flashcards?${params}`);
}

export async function generateMindmap(goalId: string, sourceType = 'goal_topics', scope = 'current_week') {
  return api.post<{ mindmap_id: string; title: string; format: string; content: string; node_count: number; generated_at: string }>(
    `/learning/goals/${goalId}/mindmap/generate`,
    { source_type: sourceType, scope, include_mastery: true }
  );
}

export async function getReport(goalId: string, period = 'week') {
  return api.get(`/learning/goals/${goalId}/report?period=${period}`);
}
