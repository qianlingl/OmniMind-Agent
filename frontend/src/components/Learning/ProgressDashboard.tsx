import { useState, useEffect } from 'react';
import { getReport, getGoal } from '../../api/learning';
import { CardSkeleton } from '../common/Skeleton';

interface Props {
  goalId: string;
}

export default function ProgressDashboard({ goalId }: Props) {
  const [report, setReport] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [r, g] = await Promise.all([getReport(goalId), getGoal(goalId)]);
        setReport(r);
        setGoal(g);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [goalId]);

  if (loading) return <CardSkeleton lines={4} />;
  if (!report || !goal) return null;

  const stats = report.stats || {};
  const progressPct = goal.progress_pct ?? 0;
  const masteryPct = ((stats.mastery_overall ?? 0) * 100).toFixed(0);
  const taskPct = stats.tasks_total > 0 ? (stats.tasks_completed / stats.tasks_total * 100).toFixed(0) : 0;
  const studyMins = stats.study_minutes ?? 0;
  const streak = stats.streak_days ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Overview hero */}
      <div className="learning-overview-card">
        <ProgressRing value={progressPct} size={80} color="#3b82f6" label="学习进度" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{goal.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {goal.daily_minutes} 分钟/天 · {goal.duration_weeks} 周
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-amber)' }}>{streak}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>天连续</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-green)' }}>{studyMins}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>分钟总计</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-purple)' }}>{stats.tasks_completed ?? 0}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>已完成任务</span>
            </div>
          </div>
        </div>
        <ProgressRing value={masteryPct} size={64} color="#10b981" label="掌握度" />
      </div>

      {/* Progress bars */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">任务完成</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${taskPct}%` }} />
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {stats.tasks_completed ?? 0}/{stats.tasks_total ?? 0}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">综合掌握度</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${masteryPct}%`,
                  background: `linear-gradient(90deg, #10b981, #34d399)`
                }} />
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--accent-green)', flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {masteryPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Mastery by topic */}
      {report.mastery_by_topic && report.mastery_by_topic.length > 0 && (
        <div className="card">
          <div className="card-header">各领域掌握度</div>
          {report.mastery_by_topic.map((t: { topic: string; mastery: number }, i: number) => {
            const pct = (t.mastery * 100).toFixed(0);
            const color = t.mastery > 0.7 ? '#10b981' : t.mastery > 0.4 ? '#f59e0b' : '#ef4444';
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t.topic}</span>
                  <span style={{ color, fontWeight: 600 }}>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weak points */}
      {report.weak_points && report.weak_points.length > 0 && (
        <div className="card">
          <div className="card-header">需要加强</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {report.weak_points.map((wp: string, i: number) => (
              <span key={i} className="badge badge-red">{wp}</span>
            ))}
          </div>
        </div>
      )}

      {/* Study timeline */}
      {report.study_days && report.study_days.length > 0 && (
        <div className="card">
          <div className="card-header">最近学习</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60, overflow: 'hidden' }}>
            {report.study_days.slice(-14).map((day: { date: string; minutes: number }, i: number) => {
              const maxMins = Math.max(...report.study_days.map((d: { minutes: number }) => d.minutes), 1);
              const height = Math.max((day.minutes / maxMins) * 50, 4);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%',
                    height,
                    borderRadius: 3,
                    background: day.minutes > 0
                      ? 'linear-gradient(180deg, #3b82f6, #22d3ee)'
                      : 'var(--bg-elevated)',
                    transition: 'height 0.4s ease',
                    minHeight: 4,
                  }} title={`${day.date}: ${day.minutes} 分钟`} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>14 天前</span>
            <span>今天</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value, size = 80, color = '#3b82f6', label }: { value: number | string; size?: number; color?: string; label: string }) {
  const pct = typeof value === 'number' ? value : parseFloat(String(value));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={6}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-fill"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(pct)}</span>
        <span style={{ fontSize: size * 0.12, color: 'var(--text-muted)', marginTop: 2 }}>%</span>
      </div>
      <div className="score-ring-label" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}
