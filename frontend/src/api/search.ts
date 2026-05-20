import { api } from './client';

export async function doSearch(query: string, engine = 'bing', maxResults = 10) {
  return api.post<{ query: string; results: Array<{ title: string; url: string; summary: string; published_at?: string }>; total_results: number }>(
    '/search',
    { query, engine, max_results: maxResults }
  );
}

export async function autoSearch(query: string) {
  return api.post<{ triggered: boolean; query: string; results: Array<{ title: string; url: string; summary: string }> }>(
    '/search/auto',
    { query }
  );
}
