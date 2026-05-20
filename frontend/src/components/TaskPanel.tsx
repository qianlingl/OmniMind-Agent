import { useState } from 'react';
import { createTask, getTask } from '../api/tasks';

const STATUS_NAMES: Record<string, string> = {
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  cancelled: '已取消',
};

export default function TaskPanel() {
  const [description, setDescription] = useState('');
  const [type, setType] = useState('code_development');
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const result = await createTask(type, description, []);
      setTask({ task_id: result.task_id, status: result.status });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!task) return;
    const updated = await getTask(task.task_id);
    setTask(updated);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">创建多 Agent 任务</div>
        <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="code_development">代码开发</option>
          <option value="doc_generation">文档生成</option>
          <option value="test_generation">测试生成</option>
        </select>
        <textarea
          className="input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="描述你的任务需求..."
          rows={3}
          style={{ marginBottom: 12, resize: 'vertical' }}
        />
        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? '创建中...' : '创建任务'}
        </button>
      </div>

      {task && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>任务: {task.task_id}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>刷新</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span className={`badge badge-${task.status === 'completed' ? 'green' : task.status === 'running' ? 'blue' : 'yellow'}`}>
              {STATUS_NAMES[task.status] || task.status}
            </span>
            <span style={{ marginLeft: 12 }}>{task.progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${task.progress || 0}%` }} />
          </div>
          {task.sub_tasks && (
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 14 }}>子任务:</strong>
              {task.sub_tasks.map((st: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <span>{st.name}</span>
                  <span className={`badge badge-${st.status === 'completed' ? 'green' : 'yellow'}`}>
                    {STATUS_NAMES[st.status] || st.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          {task.results && (
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 14 }}>执行结果:</strong>
              {Object.entries(task.results).map(([k, v]) => (
                <div key={k} style={{ marginTop: 8 }}>
                  <span className="badge badge-blue">{k === 'code' ? '代码' : k === 'tests' ? '测试' : k === 'docs' ? '文档' : k}</span>
                  <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, marginTop: 4, fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                    {String(v).slice(0, 1000)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
