const API_BASE = '/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

class ApiClient {
  private apiKey: string = '';
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
    const saved = localStorage.getItem('om_api_key');
    if (saved) {
      this.apiKey = saved;
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('om_api_key', key);
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { ...extra };
    if (this.apiKey) {
      h['X-API-Key'] = this.apiKey;
    }
    return h;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T>(path: string): Promise<T> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  async uploadFormData<T>(path: string, formData: FormData): Promise<T> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }

  streamChat(sessionId: string, content: string, onToken: (token: string) => void, onDone: () => void): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = this.apiKey ? `?token=${encodeURIComponent(this.apiKey)}` : '';
    const wsUrl = `${protocol}//${host}/api/v1/ws/sessions/${sessionId}${token}`;

    let settled = false;
    const settle = (fn?: () => void) => {
      if (settled) return;
      settled = true;
      fn?.();
    };

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'message', content }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'token') {
          onToken(data.content);
        } else if (data.type === 'done') {
          settle(() => {
            onDone();
            ws.close();
          });
        }
      } catch {
        // malformed message, ignore
      }
    };

    ws.onerror = () => {
      settle(() => {
        ws.close();
      });
    };

    ws.onclose = () => {
      if (!settled) {
        settle(() => onDone());
      }
    };

    return ws;
  }
}

export const api = new ApiClient();
