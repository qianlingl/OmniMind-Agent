import { useState, useEffect, useRef, useCallback } from 'react';
import { listFiles, uploadFile, deleteFile } from '../api/files';
import { useToast } from '../contexts/ToastContext';
import { ListSkeleton } from './common/Skeleton';
import { Upload, ArrowLeft, Folder, FileText, Trash2, ExternalLink } from 'lucide-react';

export default function FileExplorer() {
  const [files, setFiles] = useState<Array<{ name: string; type: string; size?: number; file_id?: string }>>([]);
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDir, setCurrentDir] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const dropRef = useRef<HTMLDivElement>(null);

  const load = async (dir = '') => {
    setLoading(true);
    try {
      const data = await listFiles(dir);
      setFiles(data.files);
      setPath(data.path);
      setCurrentDir(dir);
    } catch (e) {
      toast('加载文件列表失败', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(''); }, []);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    setUploading(true);
    let success = 0, fail = 0;
    for (const file of Array.from(fileList)) {
      try {
        await uploadFile(file);
        success++;
      } catch {
        fail++;
      }
    }
    if (success > 0) toast(`成功上传 ${success} 个文件`, 'success');
    if (fail > 0) toast(`${fail} 个文件上传失败`, 'error');
    setUploading(false);
    load(currentDir);
  }, [currentDir]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files;
    if (!file) return;
    await uploadFiles(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const navigateInto = (dirName: string) => {
    const newPath = currentDir ? `${currentDir}/${dirName}` : dirName;
    load(newPath);
  };

  const navigateUp = () => {
    if (!currentDir) return;
    const parts = currentDir.split('/');
    parts.pop();
    load(parts.join('/'));
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await deleteFile(fileId);
      toast(`已删除: ${fileName}`, 'success');
      load(currentDir);
    } catch (err) {
      toast('删除失败', 'error');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div ref={dropRef}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={14} strokeWidth={2} />
          {uploading ? '上传中...' : '上传文件'}
          <input type="file" multiple hidden onChange={handleUpload} />
        </label>
        {currentDir && (
          <button className="btn btn-secondary btn-sm" onClick={navigateUp}>
            <ArrowLeft size={12} strokeWidth={2} />
            返回上级
          </button>
        )}
        <div style={{ height: 1, flex: 1, background: 'var(--border-subtle)', maxWidth: 100 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          /{currentDir || '根目录'}
        </span>
      </div>

      {/* Drag-drop overlay */}
      <div
        style={{
          display: isDragOver ? 'flex' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,11,20,0.92)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          border: '2px dashed var(--accent-blue)',
          margin: '-1px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-blue)' }}>松开上传文件</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>支持多文件上传</span>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={e => { if (!dropRef.current?.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
          onDrop={handleDrop}
        >
          {files.map((f, i) => (
            <div key={i} className="card" style={{
              padding: '10px 14px',
              marginBottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: `taskSlideIn 0.2s ease backwards`,
              animationDelay: `${i * 30}ms`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {f.type === 'directory' ? (
                    <button
                    onClick={() => navigateInto(f.name)}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: 'var(--accent-cyan)', fontSize: 14, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Folder size={14} strokeWidth={1.5} />
                    {f.name}/
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {f.size && <span style={{ color: 'var(--text-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{formatSize(f.size)}</span>}
                {f.file_id && (
                  <button className="btn btn-danger btn-sm" onClick={() => f.file_id && handleDelete(f.file_id, f.name)} title="删除">
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h2>暂无文件</h2>
              <p>点击上方按钮上传，或拖拽文件到此处</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
