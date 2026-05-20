import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { createSession, listSessions, deleteSession, updateSession } from '../api/sessions';
import { useToast } from '../contexts/ToastContext';
import { Folder, Search, Zap, BookOpen, Settings, Plus, Trash2, MessageSquare, Pencil, X, Check } from 'lucide-react';

interface SessionItem {
  session_id: string;
  title?: string;
  created_at: string;
  last_active: string;
  message_count: number;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const skipRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);

  const loadSessions = async (reset = false) => {
    if (reset) {
      skipRef.current = 0;
      setHasMore(true);
    }
    try {
      setLoading(true);
      const data = await listSessions(skipRef.current, 20);
      if (reset) {
        setSessions(data.sessions);
      } else {
        setSessions(prev => [...prev, ...data.sessions]);
      }
      setHasMore(data.sessions.length === 20);
      skipRef.current += data.sessions.length;
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(true); }, [sessionId]);

  const handleNewSession = async () => {
    try {
      const s = await createSession();
      navigate(`/chat/${s.session_id}`);
    } catch (e) {
      toast('创建新对话失败', 'error');
    }
  };

  const confirmDelete = async (id: string) => {
    setDeletingId(id);
  };

  const executeDelete = async (id: string) => {
    try {
      await deleteSession(id);
      if (sessionId === id) navigate('/');
      loadSessions();
      toast('对话已删除', 'success');
    } catch (e) {
      toast('删除失败，请重试', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const startRename = (s: SessionItem) => {
    setEditingId(s.session_id);
    setEditTitle(s.title || `对话 ${s.session_id.slice(0, 6)}`);
  };

  const executeRename = async (id: string) => {
    try {
      await updateSession(id, { title: editTitle });
      loadSessions();
      toast('对话名称已更新', 'success');
    } catch (e) {
      toast('重命名失败', 'error');
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
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
    <>
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
          {loading && sessions.length === 0 && (
            <div style={{ padding: '12px 8px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 44, borderRadius: 8, marginBottom: 4, className: 'skeleton' }} />
              ))}
            </div>
          )}
          {sessions.map(s => (
            <div
              key={s.session_id}
              className={`sidebar-session-item ${s.session_id === sessionId ? 'active' : ''}`}
            >
              {editingId === s.session_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', paddingRight: 4 }}>
                  <input
                    className="input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') executeRename(s.session_id);
                      if (e.key === 'Escape') cancelRename();
                    }}
                    autoFocus
                    style={{ flex: 1, fontSize: 12, padding: '4px 8px', height: 28 }}
                  />
                  <button className="sidebar-icon-btn" onClick={() => executeRename(s.session_id)} title="确认">
                    <Check size={12} strokeWidth={2.5} />
                  </button>
                  <button className="sidebar-icon-btn" onClick={cancelRename} title="取消">
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="sidebar-session-main"
                    onClick={() => navigate(`/chat/${s.session_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="sidebar-session-title">
                      <MessageSquare size={12} strokeWidth={2} style={{ marginRight: 6, flexShrink: 0, opacity: 0.5 }} />
                      {s.title || `对话 ${s.session_id.slice(0, 6)}`}
                    </span>
                    <span className="sidebar-session-meta">
                      {s.message_count} 条消息 · {formatDate(s.last_active)}
                    </span>
                  </div>
                  <div className="sidebar-session-actions">
                    <button
                      className="sidebar-icon-btn"
                      onClick={() => startRename(s)}
                      title="重命名"
                    >
                      <Pencil size={12} strokeWidth={2} />
                    </button>
                    <button
                      className="sidebar-session-delete"
                      onClick={() => confirmDelete(s.session_id)}
                      title="删除对话"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && !loading && (
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="modal-overlay" onClick={() => setDeletingId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ minWidth: 340 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Trash2 size={18} strokeWidth={2} color="var(--accent-red)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>删除对话</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  确定要删除这个对话吗？此操作无法撤销。
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeletingId(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => executeDelete(deletingId)}>删除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
