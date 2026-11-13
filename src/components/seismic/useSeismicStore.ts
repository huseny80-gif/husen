import { create } from 'zustand';

export type Department = 'DGPS & Survey' | 'Seismic Operations' | 'HSE Safety' | 'AI Analytics';
export type AgentStatus = 'idle' | 'working' | 'alert' | 'success';

export interface Agent {
  id: string;
  name: string;
  department: Department;
  status: AgentStatus;
  currentTask: string;
  position: [number, number, number];
  progress: number;
}

interface SeismicSimulationState {
  agents: Agent[];
  activeDepartment: Department | 'All';
  simulationSpeed: number;
  setDepartment: (dept: Department | 'All') => void;
  updateAgentTask: (id: string, task: string, status: AgentStatus) => void;
  setAgentProgress: (id: string, progress: number) => void;
  moveAgent: (id: string, position: [number, number, number]) => void;
}

const patchAgent = (agents: Agent[], id: string, patch: Partial<Agent>) =>
  agents.map((a) => (a.id === id ? { ...a, ...patch } : a));

export const useSeismicStore = create<SeismicSimulationState>((set) => ({
  activeDepartment: 'All',
  simulationSpeed: 1,
  agents: [
    { id: 'agent-1', name: 'مهندس DGPS الرئيسي', department: 'DGPS & Survey', status: 'working', currentTask: 'معايرة إحداثيات الـ Leica GS18', position: [0, 0, 0], progress: 85 },
    { id: 'agent-2', name: 'مسؤول الحفر والتنقيب', department: 'Seismic Operations', status: 'working', currentTask: 'متابعة شاحنات النماد Nomad 65 Neo', position: [5, 0, -5], progress: 62 },
    { id: 'agent-3', name: 'ضابط سلامة الحقل (HSE)', department: 'HSE Safety', status: 'success', currentTask: 'تدقيق معايير البيئة الصحراوية', position: [-5, 0, 5], progress: 100 },
    { id: 'agent-4', name: 'محلل البيانات الزلزالية', department: 'AI Analytics', status: 'working', currentTask: 'معالجة العقد اللاسلكية Wireless Nodes', position: [3, 0, 5], progress: 45 },
  ],
  setDepartment: (dept) => set({ activeDepartment: dept }),
  updateAgentTask: (id, task, status) =>
    set((s) => ({ agents: patchAgent(s.agents, id, { currentTask: task, status }) })),
  setAgentProgress: (id, progress) =>
    set((s) => ({ agents: patchAgent(s.agents, id, { progress: Math.max(0, Math.min(100, progress)) }) })),
  moveAgent: (id, position) =>
    set((s) => ({ agents: patchAgent(s.agents, id, { position }) })),
}));
