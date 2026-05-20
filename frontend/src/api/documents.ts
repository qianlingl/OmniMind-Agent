import { api } from './client';

export async function parseDocument(fileId: string) {
  return api.post<{ file_id: string; content: string; tables: Array<{ header: string[]; rows: string[][] }>; metadata: Record<string, unknown> }>(
    '/documents/parse',
    { file_id: fileId }
  );
}

export async function parseUrl(url: string) {
  return api.post<{ url: string; title: string; content: string; metadata: Record<string, unknown> }>(
    '/documents/parse-url',
    { url }
  );
}
