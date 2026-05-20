import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import FilesPage from './pages/FilesPage';
import SearchPage from './pages/SearchPage';
import TasksPage from './pages/TasksPage';
import LearningPage from './pages/LearningPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/common/ErrorBoundary';

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
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
