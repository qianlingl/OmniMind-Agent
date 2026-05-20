import { useState } from 'react';
import { doSearch } from '../api/search';
import { Search, X, ExternalLink, FileText } from 'lucide-react';

interface SearchResult {
  title: string;
  url: string;
  summary: string;
  published_at?: string;
}

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await doSearch(query);
      setResults(data.results);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            className="input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="输入关键词搜索..."
            style={{ paddingRight: 40, fontSize: 15, padding: '12px 16px' }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !query.trim()} style={{ padding: '12px 24px', fontSize: 14 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              搜索中...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} strokeWidth={2} />
              搜索
            </span>
          )}
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ animation: `taskSlideIn 0.3s ease backwards`, animationDelay: `${i * 80}ms` }}>
              <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 13, width: '100%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 13, width: '80%' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={24} strokeWidth={1.5} />
          </div>
          <h2>未找到结果</h2>
          <p>试试其他关键词</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search size={24} strokeWidth={1.5} />
          </div>
          <h2>网络搜索</h2>
          <p>输入关键词搜索最新的网络资源</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            找到 {results.length} 条结果
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r, i) => (
              <div key={i} className="card" style={{ animation: `taskSlideIn 0.25s ease backwards`, animationDelay: `${i * 50}ms` }}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: 'var(--accent-cyan)', fontSize: 15, fontWeight: 600,
                    textDecoration: 'none', marginBottom: 8,
                  }}
                >
                  <FileText size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {r.title}
                  <ExternalLink size={12} strokeWidth={2} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </a>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{r.summary}</p>
                {r.published_at && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>{r.published_at}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
