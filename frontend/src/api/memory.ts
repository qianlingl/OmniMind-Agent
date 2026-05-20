import { api } from './client';

export async function createMemory(type: string, content: string, tags: string[] = [], sessionId?: string) {
  return api.post<{ memory_id: string; type: string; content: string; created_at: string }>('/memory', { type, content, tags, session_id: sessionId });
}

export async function searchMemory(query: string, type?: string, limit = 10) {
  const params = new URLSearchParams({ query, limit: String(limit) });
  if (type) params.append('type', type);
  return api.get<{ results: Array<{ memory_id: string; type: string; content: string; similarity: number }> }>(`/memory/search?${params}`);
}

export async function getMemory(memoryId: string) {
  return api.get(`/memory/${memoryId}`);
}

export async function deleteMemory(memoryId: string) {
  return api.delete(`/memory/${memoryId}`);
}
