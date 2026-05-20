import TaskPanel from '../components/TaskPanel';
import MemoryViewer from '../components/MemoryViewer';

export default function TasksPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ margin: 0 }}>多 Agent 任务</h1>
        <p className="page-subtitle">AI 自动分解任务，多个专业 Agent 并行执行</p>
      </div>
      <TaskPanel />
      <div className="page-header" style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>记忆搜索</h2>
      </div>
      <MemoryViewer />
    </div>
  );
}
