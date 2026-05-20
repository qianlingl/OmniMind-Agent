import { create } from 'zustand';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  failed?: boolean;
}

interface SessionItem {
  session_id: string;
  title?: string;
  created_at: string;
  last_active: string;
  message_count: number;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setTheme: (t: 'dark' | 'light') => void;
}

interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  streamContent: string;
  loadingHistory: boolean;
  historyError: boolean;
  setMessages: (msgs: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  updateStreaming: (val: boolean) => void;
  updateStreamContent: (val: string) => void;
  setLoadingHistory: (val: boolean) => void;
  setHistoryError: (val: boolean) => void;
  clear: () => void;
}

interface SessionState {
  sessions: SessionItem[];
  activeSessionId: string | null;
  loading: boolean;
  setSessions: (s: SessionItem[]) => void;
  addSession: (s: SessionItem) => void;
  removeSession: (id: string) => void;
  setActiveSessionId: (id: string | null) => void;
  setLoading: (val: boolean) => void;
}

interface LearningState {
  goals: Array<{ goal_id: string; title: string; status: string; progress_pct: number; streak_days: number }>;
  activeGoalId: string | null;
  loadingGoals: boolean;
  setGoals: (g: Array<{ goal_id: string; title: string; status: string; progress_pct: number; streak_days: number }>) => void;
  setActiveGoalId: (id: string | null) => void;
  setLoadingGoals: (val: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem('om_theme') as 'dark' | 'light') || 'dark',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (t) => {
    localStorage.setItem('om_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },
}));

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streaming: false,
  streamContent: '',
  loadingHistory: false,
  historyError: false,
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateStreaming: (val) => set({ streaming: val }),
  updateStreamContent: (val) => set({ streamContent: val }),
  setLoadingHistory: (val) => set({ loadingHistory: val }),
  setHistoryError: (val) => set({ historyError: val }),
  clear: () => set({ messages: [], streaming: false, streamContent: '' }),
}));

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  setSessions: (sessions) => set({ sessions }),
  addSession: (s) => set((state) => ({ sessions: [s, ...state.sessions] })),
  removeSession: (id) => set((state) => ({ sessions: state.sessions.filter((s) => s.session_id !== id) })),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setLoading: (val) => set({ loading: val }),
}));

export const useLearningStore = create<LearningState>((set) => ({
  goals: [],
  activeGoalId: null,
  loadingGoals: false,
  setGoals: (goals) => set({ goals }),
  setActiveGoalId: (id) => set({ activeGoalId: id }),
  setLoadingGoals: (val) => set({ loadingGoals: val }),
}));
