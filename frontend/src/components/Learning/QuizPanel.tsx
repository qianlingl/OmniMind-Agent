import { useState } from 'react';
import { startQuiz, submitAnswer } from '../../api/learning';

interface Props {
  goalId: string;
}

export default function QuizPanel({ goalId }: Props) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(3);
  const [quizId, setQuizId] = useState('');
  const [questions, setQuestions] = useState<Array<{ question_id: string; content: string; expected_concepts: string[] }>>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; missing_concepts: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const data = await startQuiz(goalId, topic || undefined, count);
      setQuizId(data.quiz_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setFeedback(null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const q = questions[currentIdx];
      const result = await submitAnswer(quizId, q.question_id, answer);
      setFeedback({ score: result.score, feedback: result.feedback, missing_concepts: result.missing_concepts });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setAnswer('');
      setFeedback(null);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="card">
        <div className="card-header">知识测验</div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
          AI 会根据你的学习内容生成测验题，检验你对概念的掌握程度
        </p>
        <div style={{ marginBottom: 14 }}>
          <label className="label">测验主题（可选）</label>
          <input className="input" placeholder="例如：Python 基础、机器学习概念" value={topic}
            onChange={e => setTopic(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">题目数量</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 5].map(n => (
              <button key={n} className={`btn btn-sm ${count === n ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCount(n)}>{n} 题</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: '0 4px 0 0' }} />生成中...</>
          ) : '开始测验'}
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const scoreClass = feedback
    ? feedback.score >= 4 ? 'score-excellent' : feedback.score >= 3 ? 'score-good' : feedback.score >= 2 ? 'score-adequate' : 'score-poor'
    : '';

  return (
    <div className="card">
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          题目 {currentIdx + 1}/{questions.length}
        </div>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${((currentIdx + 1) / questions.length) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #22d3ee)',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div className="quiz-question">{q.content}</div>

      {!feedback ? (
        <div>
          <textarea
            className="input"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="请用你自己的话回答这道题..."
            rows={5}
            style={{ marginBottom: 12 }}
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !answer.trim()}>
            {loading ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: '0 4px 0 0' }} />评估中...</>
            ) : '提交答案'}
          </button>
        </div>
      ) : (
        <div>
          {/* Score display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
            <div className={`score-display ${scoreClass}`} style={{ border: 'none', padding: 0, textAlign: 'left', minWidth: 80 }}>
              {feedback.score}
              <span style={{ fontSize: 14, fontWeight: 400 }}>/5</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {feedback.score >= 4 ? '掌握得很好！' : feedback.score >= 3 ? '还需要巩固' : '需要加强复习'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>分数说明：0=完全错误，5=完美回答</div>
            </div>
          </div>

          <div className="quiz-feedback">{feedback.feedback}</div>

          {feedback.missing_concepts.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                需要加强的知识点：
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {feedback.missing_concepts.map((c, i) => (
                  <span key={i} className="badge badge-red">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={handleNext}>下一题</button>
            ) : (
              <button className="btn btn-secondary" onClick={() => { setQuestions([]); setFeedback(null); }}>
                结束测验
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
