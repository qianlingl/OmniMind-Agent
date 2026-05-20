import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { createSession, listSessions, deleteSession } from '../api/sessions';
import { Folder, Search, Zap, BookOpen, Settings, Plus, Trash2, MessageSquare } from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [sessions, setSessions] = useState<Array<{ session_id: string; created_at: string; last_active: string; message_count: number }>>([]);

  const loadSessions = async () => {
    try {
      const data = await listSessions();
      setSessions(data.sessions);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadSessions(); }, [sessionId]);

  const handleNewSession = async () => {
    try {
      const s = await createSession();
      navigate(`/chat/${s.session_id}`);
      loadSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      if (sessionId === id) navigate('/');
      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand" onClick={() => navigate('/')}>
        <div className="sidebar-brand-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        OmniMind
      </div>

      <div className="sidebar-new-chat">
        <button className="sidebar-new-btn" onClick={handleNewSession}>
          <Plus size={14} strokeWidth={2.5} />
          <span>新对话</span>
        </button>
      </div>

      <div className="sidebar-sessions">
        <div className="sidebar-section-label">对话记录</div>
        {sessions.map(s => (
          <div
            key={s.session_id}
            className={`sidebar-session-item ${s.session_id === sessionId ? 'active' : ''}`}
            onClick={() => navigate(`/chat/${s.session_id}`)}
          >
            <div className="sidebar-session-main">
              <span className="sidebar-session-title">
                <MessageSquare size={12} strokeWidth={2} style={{ marginRight: 6, flexShrink: 0, opacity: 0.5 }} />
                对话 {s.session_id.slice(0, 6)}
              </span>
              <span className="sidebar-session-meta">
                {s.message_count} 条消息 · {formatDate(s.last_active)}
              </span>
            </div>
            <button
              className="sidebar-session-delete"
              onClick={(e) => handleDeleteSession(e, s.session_id)}
              title="删除对话"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="sidebar-sessions-empty">暂无对话记录</div>
        )}
      </div>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav">
        <NavLink to="/files" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <Folder size={16} className="sidebar-nav-icon" />
          <span>文件</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <Search size={16} className="sidebar-nav-icon" />
          <span>搜索</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <Zap size={16} className="sidebar-nav-icon" />
          <span>任务</span>
        </NavLink>
        <NavLink to="/learning" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={16} className="sidebar-nav-icon" />
          <span>学习</span>
        </NavLink>
      </nav>

      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} style={{ flex: 1 }}>
          <Settings size={16} className="sidebar-nav-icon" />
          <span>设置</span>
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <span className="sidebar-footer-version">v1.2.0</span>
        <span>OmniMind Agent</span>
      </div>
    </div>
  );
}
