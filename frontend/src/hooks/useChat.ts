import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage, streamChat, getSession } from '../api/sessions';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const prevSessionRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const abortRef = useRef(false);

  // Close WebSocket when session changes or unmounts
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId]);

  // Load message history when session changes
  useEffect(() => {
    if (!sessionId || sessionId === prevSessionRef.current) return;

    // Close any ongoing stream from previous session
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const load = async () => {
      setLoadingHistory(true);
      setMessages([]);
      setStreaming(false);
      setStreamContent('');
      try {
        const data = await getSession(sessionId);
        setMessages((data.messages || []) as ChatMessage[]);
        prevSessionRef.current = sessionId;
      } catch (e) {
        console.error('Failed to load session history:', e);
      }
      setLoadingHistory(false);
    };
    load();
  }, [sessionId]);

  const send = useCallback(async (content: string) => {
    if (!sessionId) return;

    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    // Try WebSocket streaming first
    setStreaming(true);
    setStreamContent('');
    let full = '';
    let gotResponse = false;
    abortRef.current = false;

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
        if (abortRef.current) return;
        setStreaming(false);
        setMessages(prev => [...prev, { role: 'assistant', content: full, timestamp: new Date().toISOString() }]);
        setStreamContent('');
        wsRef.current = null;
      },
    );

    wsRef.current = ws;

    ws.onerror = async () => {
      wsRef.current = null;
      ws.close();
      if (abortRef.current) return;
      if (!gotResponse) {
        // WebSocket failed before any response — fallback to REST API
        try {
          const result = await sendMessage(sessionId, content);
          if (abortRef.current) return;
          setStreaming(false);
          setStreamContent('');
          if (result) {
            setMessages(prev => [...prev, { role: 'assistant', content: result.content, timestamp: result.timestamp }]);
          }
        } catch (e) {
          if (abortRef.current) return;
          setStreaming(false);
          setStreamContent('');
          console.error('Send failed:', e);
        }
      } else {
        // Partial response received before failure — keep what we have
        if (abortRef.current) return;
        setStreaming(false);
        if (full) {
          setMessages(prev => [...prev, { role: 'assistant', content: full, timestamp: new Date().toISOString() }]);
        }
        setStreamContent('');
      }
    };
  }, [sessionId]);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamContent('');
    prevSessionRef.current = null;
  }, []);

  return { messages, streaming, streamContent, loadingHistory, send, clear };
}
