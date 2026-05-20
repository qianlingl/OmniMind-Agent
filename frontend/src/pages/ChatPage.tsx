import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createSession } from '../api/sessions';
import { useChat } from '../hooks/useChat';
import ChatPanel from '../components/ChatPanel';

const HINTS = [
  { icon: '📋', text: '帮我制定项目计划', sub: '目标分解与任务规划' },
  { icon: '🔬', text: '解释量子计算原理', sub: '复杂概念通俗讲解' },
  { icon: '📚', text: '制定学习计划', sub: '个性化学习路径' },
  { icon: '💻', text: '帮我写一段代码', sub: '代码编写与优化' },
  { icon: '🌐', text: '搜索最新科技资讯', sub: '联网搜索与摘要' },
  { icon: '📄', text: '分析这份文档', sub: '上传文件智能解读' },
];

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<string | null>(sessionId || null);
  const pendingMessage = useRef<string | null>(null);

  const { messages, streaming, streamContent, loadingHistory, historyError, cancel, send, retry, clear } = useChat(activeSession);

  useEffect(() => {
    if (sessionId && sessionId !== activeSession) {
      setActiveSession(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (activeSession && pendingMessage.current && !loadingHistory) {
      const msg = pendingMessage.current;
      pendingMessage.current = null;
      send(msg);
    }
  }, [activeSession, loadingHistory]);

  const handleNewSession = async () => {
    const s = await createSession();
    navigate(`/chat/${s.session_id}`);
  };

  const handleHint = async (hint: string) => {
    const s = await createSession();
    pendingMessage.current = hint;
    navigate(`/chat/${s.session_id}`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewSession();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
      if (e.key === 'Escape' && activeSession) {
        e.preventDefault();
        clear();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSession, clear, navigate]);

  return (
    <div className="chat-page">
      {activeSession ? (
        <ChatPanel
          messages={messages}
          streaming={streaming}
          streamContent={streamContent}
          loadingHistory={loadingHistory}
          onSend={content => send(content)}
          onCancel={streaming ? cancel : undefined}
          onRetry={retry}
          sessionId={activeSession}
        />
      ) : (
        <div className="chat-empty">
          <div className="chat-empty-bg" />
          <div className="chat-empty-hero">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="chat-empty-logo">OmniMind</div>
          <h2>有什么可以帮你的？</h2>
          <p>全能 AI 伙伴，支持对话、文件、联网搜索、代码分析、学习规划</p>
          <div className="chat-hint-grid">
            {HINTS.map((h, i) => (
              <button key={i} className="chat-hint-btn" onClick={() => handleHint(h.text)}>
                <span className="chat-hint-icon">{h.icon}</span>
                <span className="chat-hint-text">
                  <span className="chat-hint-main">{h.text}</span>
                  <span className="chat-hint-sub">{h.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={handleNewSession}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              空白对话
            </button>
          </div>
          <div className="chat-empty-kbd">
            <kbd>Ctrl</kbd>+<kbd>N</kbd> 新对话 &nbsp;&middot;&nbsp; <kbd>Ctrl</kbd>+<kbd>K</kbd> 搜索 &nbsp;&middot;&nbsp; <kbd>Esc</kbd> 清空
          </div>
        </div>
      )}
    </div>
  );
}
