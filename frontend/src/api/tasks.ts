import { api } from './client';

export async function createTask(type: string, description: string, requirements: string[] = []) {
  return api.post<{ task_id: string; status: string; created_at: string }>('/tasks', { type, description, requirements });
}

export async function getTask(taskId: string) {
  return api.get<{ task_id: string; status: string; progress: number; sub_tasks: Array<{ name: string; status: string }>; results?: Record<string, string> }>(`/tasks/${taskId}`);
}

export async function cancelTask(taskId: string) {
  return api.post<{ success: boolean; message: string }>(`/tasks/${taskId}/cancel`);
}
