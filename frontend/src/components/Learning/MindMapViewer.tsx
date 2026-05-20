import { useState, useEffect, useRef } from 'react';
import { generateMindmap } from '../../api/learning';

interface Props {
  goalId: string;
}

export default function MindMapViewer({ goalId }: Props) {
  const [mindmap, setMindmap] = useState<{ title: string; content: string; node_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const renderMermaid = (code: string) => {
    if (!mermaidRef.current) return;
    const div = mermaidRef.current;
    div.removeAttribute('data-processed');
    div.textContent = code;
    // Dynamically load mermaid if not available
    if ((window as any).mermaid) {
      (window as any).mermaid.init({ theme: 'dark' }, div);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateMindmap(goalId);
      setMindmap(data);
    } catch (e) {
      console.error(e);
      setError('生成思维导图失败，请稍后重试');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (mindmap && mermaidRef.current) {
      renderMermaid(mindmap.content);
    }
  }, [mindmap]);

  return (
    <div>
      {!mindmap ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-header">知识思维导图</div>
          <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 14 }}>根据你的学习内容自动生成思维导图，帮你理清知识结构</p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? '生成中...' : '生成思维导图'}
          </button>
          {error && <p style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{error}</p>}
        </div>
      ) : (
        <div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-header" style={{ margin: 0 }}>{mindmap.title}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{mindmap.node_count} 个节点</span>
              <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={loading}>重新生成</button>
            </div>
          </div>
          <div className="card mermaid" ref={mermaidRef}>
            {mindmap.content}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: '#64748b' }}>查看原始 Mermaid 语法</summary>
            <pre style={{ background: '#1e293b', padding: 12, borderRadius: 6, fontSize: 12, overflow: 'auto' }}>
              <code>{mindmap.content}</code>
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
