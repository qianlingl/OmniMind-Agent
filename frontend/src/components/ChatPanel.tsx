import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { ListSkeleton } from './common/Skeleton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Props {
  messages: Message[];
  streaming: boolean;
  streamContent: string;
  loadingHistory: boolean;
  onSend: (content: string) => void;
  sessionId?: string;
}

export default function ChatPanel({ messages, streaming, streamContent, loadingHistory, onSend, sessionId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streaming ? 'auto' : 'smooth' });
  }, [messages, streamContent]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => setShowScrollBtn(el.scrollTop < -100);
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
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
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
