import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage, streamChat, getSession } from '../api/sessions';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  failed?: boolean;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const prevSessionRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const abortRef = useRef(false);
  const msgIdRef = useRef(0);
  const pendingContentRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || sessionId === prevSessionRef.current) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const load = async () => {
      setLoadingHistory(true);
      setMessages([]);
      setStreaming(false);
      setStreamContent('');
      setHistoryError(false);
      try {
        const data = await getSession(sessionId);
        setMessages((data.messages || []) as ChatMessage[]);
        prevSessionRef.current = sessionId;
      } catch {
        setHistoryError(true);
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, [sessionId]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStreaming(false);
    setStreamContent('');
  }, []);

  const send = useCallback(async (content: string) => {
    if (!sessionId) return;

    pendingContentRef.current = content;
    const msgId = `user-${++msgIdRef.current}`;
    const userMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    setStreaming(true);
    setStreamContent('');
    let full = '';
    let gotResponse = false;
    let settled = false;
    abortRef.current = false;

    const settle = (fn?: () => void) => {
      if (settled) return;
      settled = true;
      fn?.();
    };

    const finalize = () => {
      setStreaming(false);
      if (full) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== msgId || m.role !== 'user' || m.content !== content),
          { id: `user-${msgIdRef.current}`, role: 'user', content, timestamp: userMsg.timestamp },
          { id: `ai-${msgIdRef.current}`, role: 'assistant', content: full, timestamp: new Date().toISOString() },
        ]);
      }
      setStreamContent('');
      if (wsRef.current) {
        wsRef.current = null;
      }
    };

    const doFallback = async () => {
      try {
        const result = await sendMessage(sessionId, content);
        if (abortRef.current) return;
        settle(() => {
          setStreaming(false);
          setStreamContent('');
          if (result) {
            setMessages(prev => [
              ...prev.filter(m => m.id !== msgId || m.role !== 'user' || m.content !== content),
              { id: `user-${msgIdRef.current}`, role: 'user', content, timestamp: userMsg.timestamp },
              { id: `ai-${msgIdRef.current}`, role: 'assistant', content: result.content, timestamp: result.timestamp },
            ]);
          }
        });
      } catch (e: unknown) {
        if (abortRef.current) return;
        settle(() => {
          setStreaming(false);
          setStreamContent('');
          const err = e as Error;
          const friendly = friendlyError(err);
          setMessages(prev => [
            ...prev.filter(m => m.id !== msgId || m.role !== 'user' || m.content !== content),
            { id: `user-${msgIdRef.current}`, role: 'user', content, timestamp: userMsg.timestamp },
            { id: `err-${msgIdRef.current}`, role: 'assistant', content: friendly, timestamp: new Date().toISOString(), failed: true },
          ]);
        });
      }
    };

    const reconnect = (attempt = 0) => {
      if (attempt >= 5) {
        setMessages(prev => [
          ...prev,
          { id: `conn-${Date.now()}`, role: 'assistant', content: '连接中断，请刷新页面重试。', timestamp: new Date().toISOString(), failed: true },
        ]);
        return;
      }
      setTimeout(() => {
        const ws = streamChat(
          sessionId,
          content,
          (token) => {
            if (abortRef.current) return;
            gotResponse = true;
            full += token;
            setStreamContent(full);
          },
          () => {
            if (!settled) {
              settle(() => finalize());
            }
          },
        );
        wsRef.current = ws;
        ws.onerror = () => {
          if (wsRef.current === ws) wsRef.current = null;
          ws.close();
          if (!settled) reconnect(attempt + 1);
        };
        ws.onclose = () => {
          if (!settled) {
            settle(() => {
              if (!gotResponse) {
                reconnect(attempt + 1);
              } else {
                finalize();
              }
            });
          }
        };
      }, Math.min(1000 * Math.pow(2, attempt), 30000));
    };

    const ws = streamChat(
      sessionId,
      content,
      (token) => {
        if (abortRef.current) return;
        gotResponse = true;
        full += token;
        setStreamContent(full);
      },
      () => {
        if (!settled) {
          settle(() => finalize());
        }
      },
    );

    wsRef.current = ws;

    ws.onerror = () => {
      if (wsRef.current === ws) wsRef.current = null;
      ws.close();
      if (!settled) {
        settle(() => doFallback());
      }
    };

    ws.onclose = () => {
      if (!settled) {
        settle(() => {
          if (!gotResponse) {
            doFallback();
          } else {
            finalize();
          }
        });
      }
    };
  }, [sessionId]);

  const retry = useCallback((content: string) => {
    setMessages(prev => prev.filter(m => m.content !== content || m.role !== 'user'));
    send(content);
  }, [send]);

  const clear = useCallback(() => {
    abortRef.current = true;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setMessages([]);
    setStreamContent('');
    setStreaming(false);
    prevSessionRef.current = null;
  }, []);

  return {
    messages,
    streaming,
    streamContent,
    loadingHistory,
    historyError,
    cancel,
    send,
    retry,
    clear,
  };
}

function friendlyError(err: Error): string {
  const msg = err.message || String(err);
  if (msg.includes('401') || msg.includes('403')) return '认证失败，请检查设置中的 API 密钥是否正确。';
  if (msg.includes('429')) return '请求过于频繁，请稍后再试。';
  if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch')) return '网络连接失败，请检查网络后重试。';
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return '服务器错误，请稍后再试。';
  if (msg.includes('404')) return '会话不存在或已被删除。';
  return '发送消息失败，请稍后再试。';
}
