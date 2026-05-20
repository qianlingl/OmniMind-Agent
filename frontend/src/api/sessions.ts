import { api } from './client';

export async function createSession(userId?: string) {
  return api.post<{ session_id: string; created_at: string }>('/sessions', { user_id: userId });
}

export async function listSessions(skip = 0, limit = 20) {
  return api.get<{ sessions: Array<{ session_id: string; created_at: string; last_active: string; message_count: number }>; total: number; skip: number; limit: number }>(`/sessions?skip=${skip}&limit=${limit}`);
}

export async function getSession(sessionId: string) {
  return api.get<{ session_id: string; messages: Array<{ role: string; content: string; timestamp: string }> }>(`/sessions/${sessionId}`);
}

export async function sendMessage(sessionId: string, content: string, enableSearch = false, useMemory = true) {
  return api.post<{ message_id: string; role: string; content: string; timestamp: string; sources: Array<{ type: string; id: string }> }>(
    `/sessions/${sessionId}/messages`,
    { content, files: [], enable_search: enableSearch, use_memory: useMemory }
  );
}

export async function deleteSession(sessionId: string) {
  return api.delete(`/sessions/${sessionId}`);
}

export function streamChat(sessionId: string, content: string, onToken: (t: string) => void, onDone: () => void) {
  return api.streamChat(sessionId, content, onToken, onDone);
}
