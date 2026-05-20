import { useState } from 'react';
import { searchMemory, deleteMemory } from '../api/memory';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';

const TYPE_NAMES: Record<string, string> = {
  fact: '事实',
  weak_point: '薄弱点',
  preference: '偏好',
};

const TYPE_BADGE: Record<string, string> = {
  fact: 'badge-blue',
  weak_point: 'badge-red',
  preference: 'badge-purple',
};

export default function MemoryViewer() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ memory_id: string; type: string; content: string; similarity: number }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchMemory(query);
      setResults(data.results);
    } catch (e) {
      toast('搜索失败，请重试', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('确定要删除这条记忆吗？此操作不可撤销。');
    if (!ok) return;
    try {
      await deleteMemory(id);
      setResults(prev => prev.filter(r => r.memory_id !== id));
      toast('记忆已删除', 'success');
    } catch (e) {
      toast('删除失败', 'error');
    }
  };

  return (
    <div>
      {ConfirmDialog}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜索记忆..."
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} /> : null}
          搜索
        </button>
      </div>

      {results.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <h2>记忆搜索</h2>
          <p>输入关键词搜索已保存的记忆</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map(r => (
          <div key={r.memory_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className={`badge ${TYPE_BADGE[r.type] || 'badge-blue'}`} style={{ marginBottom: 8, display: 'inline-flex' }}>
                {TYPE_NAMES[r.type] || r.type}
              </span>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: '6px 0' }}>{r.content}</p>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                相关度: {(r.similarity * 100).toFixed(0)}%
              </span>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.memory_id)} style={{ flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
