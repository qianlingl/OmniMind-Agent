import { useState } from 'react';
import { createGoal } from '../../api/learning';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  onCreated: () => void;
}

const STEPS = ['学习目标', '时间安排', '难度等级', '确认信息'];

const DAYS = [
  { key: 'monday', label: '周一' },
  { key: 'tuesday', label: '周二' },
  { key: 'wednesday', label: '周三' },
  { key: 'thursday', label: '周四' },
  { key: 'friday', label: '周五' },
  { key: 'saturday', label: '周六' },
  { key: 'sunday', label: '周日' },
];

export default function GoalWizard({ onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [availableDays, setAvailableDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (day: string) => {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await createGoal({ title, subject, topic, level, daily_minutes: dailyMinutes, duration_weeks: durationWeeks, available_days: availableDays, notes });
      onCreated();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={i} className={`wizard-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
            <span className="wizard-step-num">{i < step ? <CheckCircle2 size={14} /> : i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>你想学什么？</h3>
            <label className="label">目标名称 *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="例：学会 Python 编程" style={{ marginBottom: 12 }} />
            <label className="label">学科领域</label>
            <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="例：编程" style={{ marginBottom: 12 }} />
            <label className="label">具体方向</label>
            <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="例：Python" style={{ marginBottom: 12 }} />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>安排学习时间</h3>
            <label className="label">每天学习时长：{dailyMinutes} 分钟</label>
            <input className="input" type="range" min={10} max={120} step={5} value={dailyMinutes} onChange={e => setDailyMinutes(Number(e.target.value))} style={{ marginBottom: 16 }} />
            <label className="label">学习周期：{durationWeeks} 周</label>
            <input className="input" type="range" min={4} max={24} step={1} value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))} style={{ marginBottom: 16 }} />
            <label className="label">学习日</label>
            <div className="day-selector">
              {DAYS.map(d => (
                <button
                  key={d.key}
                  type="button"
                  className={`btn btn-sm ${availableDays.includes(d.key) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleDay(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>你的当前水平？</h3>
            <div className="level-options">
              {[
                { key: 'beginner', label: '入门', desc: '零基础，从零开始' },
                { key: 'intermediate', label: '进阶', desc: '有一定基础，想系统提升' },
                { key: 'advanced', label: '高级', desc: '已具备能力，追求精通' },
              ].map(l => (
                <div
                  key={l.key}
                  className={`level-card ${level === l.key ? 'selected' : ''}`}
                  onClick={() => setLevel(l.key)}
                >
                  <div className="level-title">{l.label}</div>
                  <div className="level-desc">{l.desc}</div>
                </div>
              ))}
            </div>
            <label className="label" style={{ marginTop: 16 }}>补充说明（选填）</label>
            <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="任何想补充的内容..." rows={3} style={{ resize: 'vertical' }} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>确认学习计划</h3>
            <div className="confirm-grid">
              <div className="confirm-item"><span className="confirm-label">目标</span><span>{title}</span></div>
              <div className="confirm-item"><span className="confirm-label">学科</span><span>{subject}</span></div>
              <div className="confirm-item"><span className="confirm-label">方向</span><span>{topic}</span></div>
              <div className="confirm-item"><span className="confirm-label">时长</span><span>{dailyMinutes} 分钟/天</span></div>
              <div className="confirm-item"><span className="confirm-label">周期</span><span>{durationWeeks} 周</span></div>
              <div className="confirm-item"><span className="confirm-label">学习日</span><span>{availableDays.map(d => DAYS.find(dd => dd.key === d)?.label).join('、')}</span></div>
              <div className="confirm-item"><span className="confirm-label">水平</span><span>{{ beginner: '入门', intermediate: '进阶', advanced: '高级' }[level]}</span></div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-secondary" disabled={step === 0} onClick={() => setStep(s => s - 1)}>上一步</button>
        {step < 3 ? (
          <button className="btn btn-primary" disabled={step === 0 && !title.trim()} onClick={() => setStep(s => s + 1)}>
            下一步
          </button>
        ) : (
          <button className="btn btn-success" disabled={submitting} onClick={handleSubmit}>
            {submitting ? '创建中...' : '开始学习'}
          </button>
        )}
      </div>
    </div>
  );
}
