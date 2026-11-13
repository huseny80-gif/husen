import { create } from 'zustand';

export const DEPARTMENTS = ['DGPS & Survey', 'Seismic Operations', 'HSE Safety', 'AI Analytics'] as const;
export type Department = (typeof DEPARTMENTS)[number];
export type AgentStatus = 'idle' | 'working' | 'alert' | 'success';

export interface Agent {
  id: string;
  name: string;
  department: Department;
  status: AgentStatus;
  currentTask: string;
  position: [number, number, number];
  progress: number;
  /** epoch ms when the current task started; progress is derived from it */
  taskStartedAt: number | null;
  taskDurationMs: number;
}

/** loading: first fetch in flight · live: Supabase + Realtime · demo: no Supabase env, local only */
export type SyncMode = 'loading' | 'live' | 'demo';

interface SeismicState {
  agents: Agent[];
  activeDepartment: Department | 'All';
  mode: SyncMode;
  /** true when the signed-in user may write (instructor/admin), or in demo mode */
  canControl: boolean;
  error: string | null;
  setDepartment: (dept: Department | 'All') => void;
  setMeta: (meta: Partial<Pick<SeismicState, 'mode' | 'canControl' | 'error'>>) => void;
  replaceAll: (agents: Agent[]) => void;
  upsertAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  patchAgent: (id: string, patch: Partial<Agent>) => void;
}

export const DEMO_AGENTS: Agent[] = [
  { id: 'agent-1', name: 'مهندس DGPS الرئيسي', department: 'DGPS & Survey', status: 'working', currentTask: 'معايرة إحداثيات الـ Leica GS18', position: [0, 0, 0], progress: 85, taskStartedAt: null, taskDurationMs: 3000 },
  { id: 'agent-2', name: 'مسؤول الحفر والتنقيب', department: 'Seismic Operations', status: 'working', currentTask: 'متابعة شاحنات النماد Nomad 65 Neo', position: [5, 0, -5], progress: 62, taskStartedAt: null, taskDurationMs: 3000 },
  { id: 'agent-3', name: 'ضابط سلامة الحقل (HSE)', department: 'HSE Safety', status: 'success', currentTask: 'تدقيق معايير البيئة الصحراوية', position: [-5, 0, 5], progress: 100, taskStartedAt: null, taskDurationMs: 3000 },
  { id: 'agent-4', name: 'محلل البيانات الزلزالية', department: 'AI Analytics', status: 'working', currentTask: 'معالجة العقد اللاسلكية Wireless Nodes', position: [3, 0, 5], progress: 45, taskStartedAt: null, taskDurationMs: 3000 },
];

export const useSeismicStore = create<SeismicState>((set) => ({
  agents: [],
  activeDepartment: 'All',
  mode: 'loading',
  canControl: false,
  error: null,
  setDepartment: (dept) => set({ activeDepartment: dept }),
  setMeta: (meta) => set(meta),
  replaceAll: (agents) => set({ agents }),
  upsertAgent: (agent) =>
    set((s) => {
      const exists = s.agents.some((a) => a.id === agent.id);
      return {
        agents: exists ? s.agents.map((a) => (a.id === agent.id ? agent : a)) : [...s.agents, agent].sort((a, b) => a.id.localeCompare(b.id)),
      };
    }),
  removeAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
  patchAgent: (id, patch) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
}));
