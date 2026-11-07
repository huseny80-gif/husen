import { create } from "zustand";
import {
  AGENTS,
  SEISMIC_DGPS_WORKFLOW,
  type AgentConfig,
  type WorkflowConfig,
} from "@/config/customDelegationConfig";

export interface AgentState extends AgentConfig {
  position: [number, number, number];
  isActive: boolean;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  message: string;
  stepIndex: number;
}

interface SimulationStore {
  agents: AgentState[];
  currentWorkflow: WorkflowConfig;
  currentStepIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  logs: SimulationLog[];
  activeAgentId: string | null;

  startWorkflow: () => void;
  nextStep: () => void;
  pauseWorkflow: () => void;
  resumeWorkflow: () => void;
  resetWorkflow: () => void;
  updateAgentPosition: (agentId: string, position: [number, number, number]) => void;
  addLog: (message: string, stepIndex: number) => void;
}

const buildInitialAgents = (): AgentState[] =>
  AGENTS.map((a) => ({
    ...a,
    position: [...a.initialPosition] as [number, number, number],
    isActive: false,
  }));

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  agents: buildInitialAgents(),
  currentWorkflow: SEISMIC_DGPS_WORKFLOW,
  currentStepIndex: -1,
  isRunning: false,
  isPaused: false,
  logs: [],
  activeAgentId: null,

  startWorkflow: () => {
    const { currentWorkflow, addLog } = get();
    const firstStep = currentWorkflow.steps[0];
    addLog(
      `▶ Starting workflow: "${currentWorkflow.name}"`,
      0
    );
    set((state) => ({
      isRunning: true,
      isPaused: false,
      currentStepIndex: 0,
      activeAgentId: firstStep.agentId,
      agents: state.agents.map((a) => ({
        ...a,
        isActive: a.id === firstStep.agentId,
        position:
          a.id === firstStep.agentId
            ? firstStep.targetPosition
            : a.position,
      })),
    }));
    addLog(firstStep.outputLog, 0);
  },

  nextStep: () => {
    const { currentStepIndex, currentWorkflow, isRunning, isPaused, addLog } =
      get();
    if (!isRunning || isPaused) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= currentWorkflow.steps.length) {
      set({ isRunning: false, activeAgentId: null });
      addLog("■ Workflow complete.", nextIndex - 1);
      return;
    }

    const step = currentWorkflow.steps[nextIndex];
    set((state) => ({
      currentStepIndex: nextIndex,
      activeAgentId: step.agentId,
      agents: state.agents.map((a) => ({
        ...a,
        isActive: a.id === step.agentId,
        position:
          a.id === step.agentId ? step.targetPosition : a.position,
      })),
    }));
    addLog(step.outputLog, nextIndex);
  },

  pauseWorkflow: () => set({ isPaused: true }),

  resumeWorkflow: () => set({ isPaused: false }),

  resetWorkflow: () => {
    set({
      agents: buildInitialAgents(),
      currentStepIndex: -1,
      isRunning: false,
      isPaused: false,
      logs: [],
      activeAgentId: null,
    });
  },

  updateAgentPosition: (agentId, position) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, position } : a
      ),
    })),

  addLog: (message, stepIndex) => {
    const entry: SimulationLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      message,
      stepIndex,
    };
    set((state) => ({ logs: [...state.logs, entry] }));
  },
}));
