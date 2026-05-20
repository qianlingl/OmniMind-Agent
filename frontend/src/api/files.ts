import { api } from './client';

export async function uploadFile(file: File, sessionId?: string) {
  const fd = new FormData();
  fd.append('file', file);
  if (sessionId) fd.append('session_id', sessionId);
  return api.uploadFormData<{ file_id: string; filename: string; size: number; type: string; uploaded_at: string }>('/files/upload', fd);
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export function uploadFileWithProgress(
  file: File,
  sessionId: string | undefined,
  onProgress: (p: UploadProgress) => void
): Promise<{ file_id: string; filename: string; size: number; type: string; uploaded_at: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);
    if (sessionId) fd.append('session_id', sessionId);

    const apiKey = api.getApiKey();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress({ loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100) });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('解析响应失败'));
        }
      } else {
        reject(new Error(`${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('网络错误')));
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

    xhr.open('POST', '/api/v1/files/upload');
    if (apiKey) xhr.setRequestHeader('X-API-Key', apiKey);
    xhr.send(fd);
  });
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
