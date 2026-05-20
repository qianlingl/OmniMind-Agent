import { useState, useEffect, useRef } from 'react';
import { listFlashcards, submitFlashcardFeedback, generateFlashcards } from '../../api/learning';
import { CardSkeleton } from '../common/Skeleton';

interface Props {
  goalId: string;
}

export default function FlashcardReviewer({ goalId }: Props) {
  const [flashcards, setFlashcards] = useState<Array<{ flashcard_id: string; front: string; back: string; mastery: number; tags: string[] }>>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    try {
      const data = await listFlashcards(goalId, 'due');
      setFlashcards((data as any).flashcards || []);
      setCurrentIdx(0);
      setFlipped(false);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [goalId]);

  const handleQuality = async (quality: number) => {
    const fc = flashcards[currentIdx];
    if (!fc) return;
    // Use the flashcard-specific feedback endpoint
    await submitFlashcardFeedback(fc.flashcard_id, quality);
    setFlipped(false);
    if (currentIdx < flashcards.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      load();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await generateFlashcards(goalId, file, null, 10);
      load();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleTextGenerate = async () => {
    const text = notesRef.current?.value;
    if (!text) return;
    setUploading(true);
    try {
      await generateFlashcards(goalId, null, text, 10);
      if (notesRef.current) notesRef.current.value = '';
      load();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  if (loading) return <CardSkeleton lines={3} />;

  if (flashcards.length === 0) {
    return (
      <div className="card">
        <div className="card-header">闪卡复习</div>
        <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 14 }}>还没有闪卡。上传笔记或粘贴文字，AI 会自动生成问答闪卡。</p>
        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
          {uploading ? '生成中...' : '上传笔记'}
          <input type="file" hidden accept=".pdf,.txt,.md,.docx" onChange={handleUpload} />
        </label>
        <div style={{ marginTop: 16 }}>
          <textarea ref={notesRef} className="input" placeholder="或直接粘贴笔记内容..." rows={4} style={{ resize: 'vertical' }} />
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={handleTextGenerate}>
            {uploading ? '生成中...' : '从文字生成'}
          </button>
        </div>
      </div>
    );
  }

  const fc = flashcards[currentIdx];

  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: '#94a3b8' }}>
          第 {currentIdx + 1} / {flashcards.length} 张
        </span>
      </div>
      <div className="flashcard" onClick={() => setFlipped(!flipped)}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>问题</div>
              {fc.front}
            </div>
          </div>
          <div className="flashcard-back">
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>答案</div>
              {fc.back}
            </div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#64748b' }}>点击卡片翻转查看答案</p>

      {flipped && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {[
            { q: 0, label: '完全不会', cls: 'btn-danger' },
            { q: 1, label: '很不熟', cls: 'btn-danger' },
            { q: 2, label: '不太熟', cls: 'btn-danger' },
            { q: 3, label: '一般', cls: 'btn-primary' },
            { q: 4, label: '较熟', cls: 'btn-primary' },
            { q: 5, label: '很熟', cls: 'btn-success' },
          ].map(item => (
            <button key={item.q} className={`btn btn-sm ${item.cls}`}
              onClick={() => handleQuality(item.q)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
