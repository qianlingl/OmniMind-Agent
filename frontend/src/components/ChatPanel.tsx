import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ListSkeleton } from './common/Skeleton';
import { StopCircle } from 'lucide-react';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  failed?: boolean;
}

interface Props {
  messages: Message[];
  streaming: boolean;
  streamContent: string;
  loadingHistory: boolean;
  onSend: (content: string) => void;
  onCancel?: () => void;
  onRetry?: (content: string) => void;
  sessionId?: string;
}

export default function ChatPanel({ messages, streaming, streamContent, loadingHistory, onSend, onCancel, onRetry, sessionId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streaming ? 'auto' : 'smooth' });
  }, [messages, streamContent]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => {
      const isNearBottom = el.scrollTop < el.scrollHeight - el.clientHeight - 200;
      setShowScrollBtn(!isNearBottom);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loadingHistory) {
    return (
      <div className="chat-container">
        <div className="chat-messages">
          <ListSkeleton rows={5} />
        </div>
        <ChatInput onSend={onSend} disabled sessionId={sessionId} />
      </div>
    );
  }

  return (
    <div className="chat-container" style={{ position: 'relative' }}>
      <div className="chat-messages" ref={containerRef}>
        {historyError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>加载历史消息失败</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setHistoryError(false); window.location.reload(); }}
            >
              重试
            </button>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id || `${msg.role}-${msg.timestamp}`} style={{ position: 'relative' }}>
            <MessageBubble
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              failed={msg.failed}
            />
            {msg.failed && onRetry && (
              <button
                onClick={() => onRetry(msg.content)}
                className="btn btn-sm"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  fontSize: 11,
                  padding: '3px 10px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5',
                }}
              >
                重试
              </button>
            )}
          </div>
        ))}
        {streaming && streamContent && (
          <div className="message assistant">
            <MessageBubble role="assistant" content={streamContent} streaming timestamp="" />
          </div>
        )}
        {streaming && !streamContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
              boxShadow: '0 0 12px rgba(59,130,246,0.4)',
            }}>
              AI
            </div>
            <div className="chat-typing-indicator">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {streaming && onCancel && (
        <button
          className="btn btn-ghost"
          onClick={onCancel}
          title="停止生成"
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            padding: '6px 12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5',
            borderRadius: 'var(--radius-md)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <StopCircle size={13} strokeWidth={2} />
          停止
        </button>
      )}

      {showScrollBtn && (
        <button
          className="btn btn-icon btn-secondary"
          onClick={scrollToBottom}
          title="滚动到底部"
          style={{
            position: 'absolute',
            bottom: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      <ChatInput onSend={onSend} disabled={streaming} sessionId={sessionId} />
    </div>
  );
}

