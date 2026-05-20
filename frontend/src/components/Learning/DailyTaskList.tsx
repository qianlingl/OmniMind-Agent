import { useState, useEffect } from 'react';
import { getTodayTasks, updateTask } from '../../api/learning';
import { ListSkeleton } from '../common/Skeleton';
import { CheckCircle2, SkipForward, BookOpen, Dumbbell, RefreshCw, HelpCircle, Rocket, FileText } from 'lucide-react';

interface Props {
  goalId: string;
}

const TYPE_META: Record<string, { label: string; cls: string; Icon: typeof BookOpen }> = {
  reading:  { label: '阅读', cls: 'type-reading', Icon: BookOpen },
  practice: { label: '练习', cls: 'type-practice', Icon: Dumbbell },
  review:   { label: '复习', cls: 'type-review', Icon: RefreshCw },
  quiz:      { label: '测验', cls: 'type-quiz', Icon: HelpCircle },
  project:  { label: '项目', cls: 'type-quiz', Icon: Rocket },
};

export default function DailyTaskList({ goalId }: Props) {
  const [tasks, setTasks] = useState<Array<{ task_id: string; title: string; type: string; duration_min: number; status: string; order: number }>>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getTodayTasks(goalId);
      setTasks(data.tasks);
      setTotalMinutes(data.total_minutes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [goalId]);

  const handleComplete = async (taskId: string) => {
    await updateTask(taskId, 'completed');
    load();
  };

  const handleSkip = async (taskId: string) => {
    await updateTask(taskId, 'skipped');
    load();
  };

  if (loading) return <ListSkeleton rows={3} />;

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>今日任务</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {completed}/{total} 已完成 · 共 {totalMinutes} 分钟
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: progressPct === 100 ? 'var(--accent-green)' : 'var(--accent-blue)', lineHeight: 1 }}>
              {progressPct}%
            </div>
          </div>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <div className="progress-fill" style={{
            width: `${progressPct}%`,
            background: progressPct === 100
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #3b82f6, #22d3ee)',
          }} />
        </div>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <CheckCircle2 size={28} strokeWidth={1.5} color="var(--accent-green)" />
          </div>
          <h2>今天没有安排任务</h2>
          <p>好好休息，明天继续加油！</p>
        </div>
      ) : (
        tasks.map(t => {
          const meta = TYPE_META[t.type] || { label: t.type, cls: 'type-reading', icon: '📝' };
          return (
            <div key={t.task_id} className={`task-item ${t.status}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                {t.status === 'completed' && (
                  <CheckCircle2 size={16} strokeWidth={2.5} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                )}
                {t.status === 'skipped' && (
                  <SkipForward size={16} strokeWidth={2} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                )}
                <span className={`badge ${meta.cls}`} style={{ flexShrink: 0 }}>
                  <meta.Icon size={11} style={{ marginRight: 3 }} />
                  {meta.label}
                </span>
                <span style={{
                  fontSize: 14,
                  color: t.status !== 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: t.status === 'completed' ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {t.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {t.duration_min}m
                </span>
                {t.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleComplete(t.task_id)}>完成</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleSkip(t.task_id)}>跳过</button>
                  </div>
                )}
                {t.status === 'completed' && (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>已完成</span>
                )}
                {t.status === 'skipped' && (
                  <span className="badge badge-yellow" style={{ fontSize: 10 }}>跳过</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
