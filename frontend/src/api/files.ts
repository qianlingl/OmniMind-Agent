import { api } from './client';

export async function uploadFile(file: File, sessionId?: string) {
  const fd = new FormData();
  fd.append('file', file);
  if (sessionId) fd.append('session_id', sessionId);
  return api.uploadFormData<{ file_id: string; filename: string; size: number; type: string; uploaded_at: string }>('/files/upload', fd);
}

export async function readFile(fileId: string) {
  return api.get<{ file_id: string; content: string; encoding: string }>(`/files/${fileId}/content`);
}

export async function writeFile(fileId: string, content: string, append = false) {
  return api.put<{ success: boolean; file_id: string; size: number }>(`/files/${fileId}/content`, { content, append });
}

export async function deleteFile(fileId: string) {
  return api.delete<{ success: boolean; message: string }>(`/files/${fileId}`);
}

export async function listFiles(path = '') {
  return api.get<{ path: string; files: Array<{ name: string; type: string; size?: number; file_id?: string }> }>(`/files/list?path=${encodeURIComponent(path)}`);
}
