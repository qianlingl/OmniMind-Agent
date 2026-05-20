import { FormEvent, useRef, useState, KeyboardEvent } from 'react';
import { uploadFile } from '../api/files';
import { useToast } from '../contexts/ToastContext';
import { X, Paperclip, Send } from 'lucide-react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  sessionId?: string;
}

const MAX_CHARS = 4000;

export default function ChatInput({ onSend, disabled, sessionId }: Props) {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isNearLimit = text.length > MAX_CHARS * 0.85;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const result = await uploadFile(file, sessionId);
      const injected = `已上传文件: **${result.filename}** (${(result.size / 1024).toFixed(1)} KB)`;
      onSend(injected);
      toast('文件上传成功', 'success');
    } catch {
      toast('文件上传失败', 'error');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <div
        className={`chat-input-wrapper ${isDragOver ? 'chat-input-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
          disabled={disabled}
          autoComplete="off"
          spellCheck
          rows={1}
          style={{
            resize: 'none',
            overflowY: 'auto',
            maxHeight: 160,
            lineHeight: 1.6,
            padding: '8px 0',
          }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 160) + 'px';
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {text && (
            <button
              type="button"
              className="btn-icon btn-ghost"
              onClick={() => { setText(''); textareaRef.current?.focus(); }}
              title="清空"
              style={{ width: 28, height: 28 }}
            >
            <X size={13} strokeWidth={2.5} />
            </button>
          )}
          <button
            type="button"
            className="btn-icon btn-ghost"
            onClick={() => fileRef.current?.click()}
            title="附加文件"
            style={{ width: 28, height: 28 }}
          >
            <Paperclip size={14} strokeWidth={2} />
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={handleFileInput}
          />
          <button
            className="chat-send-btn"
            type="submit"
            disabled={disabled || !text.trim()}
            title="发送 (Enter)"
          >
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        padding: '0 4px',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {isDragOver ? (
            <span style={{ color: 'var(--accent-blue)' }}>松开以上传文件</span>
          ) : (
            <span>支持拖拽文件上传 · Shift+Enter 换行</span>
          )}
        </span>
        <span style={{
          fontSize: 11,
          color: isNearLimit ? 'var(--accent-amber)' : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {text.length}/{MAX_CHARS}
        </span>
      </div>
    </form>
  );
}
