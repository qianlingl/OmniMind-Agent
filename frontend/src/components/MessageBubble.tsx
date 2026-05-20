import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  role: string;
  content: string;
  streaming?: boolean;
  timestamp?: string;
}

export default function MessageBubble({ role, content, streaming, timestamp }: Props) {
  const [msgCopied, setMsgCopied] = useState(false);
  const isUser = role === 'user';

  const copyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 2000);
    } catch { /* ignore */ }
  }, [content]);

  const formatTime = (ts: string) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className={`message ${role}`}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
            boxShadow: '0 0 12px rgba(59,130,246,0.4)',
          }}>
            AI
          </div>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>OmniMind</span>
          {streaming && <StreamingCursor />}
        </div>
      )}
      <div className="message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{ code: CodeBlock, pre: PreBlock }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {isUser && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(timestamp || '')}</span>
        </div>
      )}
      {!isUser && !streaming && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <button
            onClick={copyMessage}
            style={{
              background: 'none', border: 'none', padding: '2px 6px',
              cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 3,
              borderRadius: 4, transition: 'all 0.15s',
              opacity: 0,
            }}
            className="msg-action-btn"
            title="复制回复"
          >
            {msgCopied ? (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg> 已复制</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function StreamingCursor() {
  return <span className="streaming-cursor" />;
}

function PreBlock({ children }: { children?: React.ReactNode }) {
  return <pre className="code-block-wrapper">{children}</pre>;
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const isInline = !className;

  const copy = useCallback(async () => {
    const text = String(children ?? '').replace(/\n$/, '');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [children]);

  if (isInline) return <code className={className}>{children}</code>;

  return (
    <div className="code-block-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>{className?.replace('language-', '') || 'code'}</span>
        <button className="code-copy-btn" onClick={copy}>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <code className={className}>{children}</code>
    </div>
  );
}
