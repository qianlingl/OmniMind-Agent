import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import FilesPage from './pages/FilesPage';
import SearchPage from './pages/SearchPage';
import TasksPage from './pages/TasksPage';
import LearningPage from './pages/LearningPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16, padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--border-strong)', lineHeight: 1 }}>
        404
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>
        页面不存在
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
        你访问的页面不存在或已被移除。
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 8 }}>
        返回首页
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat/:sessionId?" element={<ChatPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
