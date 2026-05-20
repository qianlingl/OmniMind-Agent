import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  role: string;
  content: string;
  streaming?: boolean;
  timestamp?: string;
  failed?: boolean;
}

export default function MessageBubble({ role, content, streaming, timestamp, failed }: Props) {
  const [msgCopied, setMsgCopied] = useState(false);
  const isUser = role === 'user';

  const copyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setMsgCopied(true);
      setTimeout(() => setMsgCopied(false), 2000);
    } catch {
      setMsgCopied(false);
    }
  }, [content]);

  const formatTime = (ts: string) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  if (failed) {
    return (
      <div className={`message ${role}`} style={{ opacity: 0.7 }}>
        <div className="message-content" style={{ color: 'var(--accent-red)', fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          消息发送失败，请重试
        </div>
      </div>
    );
  }

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
      <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'center', marginTop: 4, gap: 6 }}>
        {timestamp && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(timestamp)}</span>
        )}
      </div>
      {!isUser && !streaming && (
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
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
  const [copyError, setCopyError] = useState(false);
  const isInline = !className;

  const copy = useCallback(async () => {
    const text = String(children ?? '').replace(/\n$/, '');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2500);
    }
  }, [children]);

  if (isInline) return <code className={className}>{children}</code>;

  const lang = className?.replace('language-', '').replace(/^diff[+-]?/, '') || 'code';

  return (
    <div className="code-block-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4, fontFamily: 'var(--font-mono)' }}>{lang}</span>
        <button className="code-copy-btn" onClick={copy} title={copyError ? '复制失败，请检查浏览器权限' : '复制代码'}>
          {copyError ? (
            <span style={{ color: 'var(--accent-red)' }}>复制失败</span>
          ) : copied ? (
            <span style={{ color: 'var(--accent-green)' }}>已复制</span>
          ) : (
            '复制'
          )}
        </button>
      </div>
      <code className={className}>{children}</code>
    </div>
  );
}

