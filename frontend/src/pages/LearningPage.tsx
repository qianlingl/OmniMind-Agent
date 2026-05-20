import { useState, useEffect, useCallback } from 'react';
import { listGoals } from '../api/learning';
import GoalWizard from '../components/Learning/GoalWizard';
import ProgressDashboard from '../components/Learning/ProgressDashboard';
import DailyTaskList from '../components/Learning/DailyTaskList';
import QuizPanel from '../components/Learning/QuizPanel';
import FlashcardReviewer from '../components/Learning/FlashcardReviewer';
import MindMapViewer from '../components/Learning/MindMapViewer';
import { LayoutDashboard, CheckSquare, HelpCircle, Layers, Network, BookOpen } from 'lucide-react';

export default function LearningPage() {
  const [goals, setGoals] = useState<Array<{ goal_id: string; title: string; status: string; progress_pct: number; streak_days: number }>>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [tab, setTab] = useState('dashboard');
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGoals();
      setGoals(data.goals);
      setActiveGoalId(prev => prev || (data.goals.length > 0 ? data.goals[0].goal_id : null));
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const handleGoalCreated = () => {
    setShowWizard(false);
    loadGoals();
  };

  const tabs = [
    { key: 'dashboard', label: '概览', icon: LayoutDashboard },
    { key: 'tasks', label: '任务', icon: CheckSquare },
    { key: 'quiz', label: '测验', icon: HelpCircle },
    { key: 'flashcards', label: '闪卡', icon: Layers },
    { key: 'mindmap', label: '导图', icon: Network },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div className="page-header">
          <h1 style={{ margin: 0 }}>学习助手</h1>
          <p className="page-subtitle">制定计划、每日任务、测验、闪卡复习</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowWizard(!showWizard)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {showWizard ? '取消' : '新建目标'}
        </button>
      </div>

      {showWizard && <GoalWizard onCreated={handleGoalCreated} />}

      {loading && goals.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>加载中...</div>}

      {goals.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {goals.map(g => (
              <button
                key={g.goal_id}
                className={`btn btn-sm ${g.goal_id === activeGoalId ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setActiveGoalId(g.goal_id);
                  setTab('dashboard');
                }}
                style={{ fontSize: 12 }}
              >
                {g.title}
                <span style={{ opacity: 0.7, marginLeft: 4 }}>{g.progress_pct}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeGoalId && (
        <>
          <div className="tabs">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <t.icon size={14} style={{ marginRight: 5 }} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'dashboard' && <ProgressDashboard goalId={activeGoalId} key={`dash-${activeGoalId}`} />}
          {tab === 'tasks' && <DailyTaskList goalId={activeGoalId} key={`tasks-${activeGoalId}`} />}
          {tab === 'quiz' && <QuizPanel goalId={activeGoalId} key={`quiz-${activeGoalId}`} />}
          {tab === 'flashcards' && <FlashcardReviewer goalId={activeGoalId} key={`fc-${activeGoalId}`} />}
          {tab === 'mindmap' && <MindMapViewer goalId={activeGoalId} key={`mm-${activeGoalId}`} />}
        </>
      )}

      {goals.length === 0 && !showWizard && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <h2>还没有学习目标</h2>
          <p>创建一个学习目标，开启你的个性化 AI 学习之旅</p>
          <button className="btn btn-primary" onClick={() => setShowWizard(true)}>
            创建第一个目标
          </button>
        </div>
      )}
    </div>
  );
}
