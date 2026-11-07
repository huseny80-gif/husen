export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  model: string;
  systemPrompt: string;
  color: string;
  initialPosition: [number, number, number];
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  agentId: string;
  targetPosition: [number, number, number];
  durationMs: number;
  outputLog: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export const AGENTS: AgentConfig[] = [
  {
    id: "data-collector",
    name: "DGPS Field Collector",
    role: "Seismic Data Acquisition Specialist",
    model: "gemini-2.5-flash",
    color: "#D4AF37",
    systemPrompt:
      "You are a precision DGPS field data collection specialist. Your role is to acquire raw seismic survey coordinates, elevation data, and shot-point metadata from field instruments. Output structured JSON with fields: shot_point_id, latitude, longitude, elevation_m, timestamp, quality_flag.",
    initialPosition: [-6, 0, -4],
  },
  {
    id: "data-processor",
    name: "Seismic Processor",
    role: "Signal Processing Engineer",
    model: "gemini-2.5-flash",
    color: "#00897B",
    systemPrompt:
      "You are a seismic signal processing engineer. You receive raw DGPS survey data and apply coordinate transformations, datum conversions (WGS84 → local grid), and noise filtering. Produce a clean processed dataset with QC metrics.",
    initialPosition: [-2, 0, -4],
  },
  {
    id: "analyst",
    name: "Subsurface Analyst",
    role: "Geophysical Interpretation Lead",
    model: "gemini-2.5-flash",
    color: "#004D40",
    systemPrompt:
      "You are a senior geophysical interpretation specialist. You analyze processed seismic datasets to identify structural anomalies, fault lines, and potential hydrocarbon traps. Generate a technical interpretation report with risk assessments.",
    initialPosition: [2, 0, -4],
  },
  {
    id: "strategist",
    name: "Digital Strategist",
    role: "Leadership Strategy Director",
    model: "gemini-2.5-flash",
    color: "#B8860B",
    systemPrompt:
      "You are a digital transformation strategist for executive leadership. You translate complex geophysical findings into actionable business strategy recommendations, investment priorities, and digital roadmap initiatives for C-suite stakeholders.",
    initialPosition: [6, 0, -4],
  },
];

export const SEISMIC_DGPS_WORKFLOW: WorkflowConfig = {
  id: "seismic-dgps-pipeline",
  name: "Seismic DGPS Survey Pipeline",
  description:
    "End-to-end seismic DGPS data processing and strategic reporting workflow",
  steps: [
    {
      id: "step-1-acquisition",
      title: "Field Data Acquisition",
      description: "DGPS Collector acquires raw seismic shot-point coordinates",
      agentId: "data-collector",
      targetPosition: [-6, 0, 2],
      durationMs: 3000,
      outputLog:
        "→ DGPS Field Collector: Acquiring shot-point data... 847 coordinates captured. QC pass rate: 98.2%",
    },
    {
      id: "step-2-transfer",
      title: "Data Transfer to Processing Lab",
      description: "Raw data transmitted from field to processing workstation",
      agentId: "data-collector",
      targetPosition: [-4, 0, 0],
      durationMs: 2000,
      outputLog: "→ DGPS Field Collector: Transmitting dataset to Processor...",
    },
    {
      id: "step-3-processing",
      title: "Coordinate Processing & QC",
      description: "Signal processor applies datum transforms and noise filters",
      agentId: "data-processor",
      targetPosition: [-2, 0, 2],
      durationMs: 4000,
      outputLog:
        "→ Seismic Processor: Applying WGS84→UTM Zone 38N transform. RMSE: 0.03m. 12 outliers flagged and removed.",
    },
    {
      id: "step-4-handoff",
      title: "Processed Data Handoff",
      description: "Clean dataset delivered to interpretation team",
      agentId: "data-processor",
      targetPosition: [0, 0, 0],
      durationMs: 1500,
      outputLog:
        "→ Seismic Processor: Delivering processed dataset (835 clean points) to Subsurface Analyst.",
    },
    {
      id: "step-5-interpretation",
      title: "Subsurface Interpretation",
      description: "Analyst identifies structural features and anomalies",
      agentId: "analyst",
      targetPosition: [2, 0, 2],
      durationMs: 5000,
      outputLog:
        "→ Subsurface Analyst: Identified 3 structural closures. Fault system detected at 2.4km depth. Estimated DHI at CDP 1240-1380. Risk factor: MEDIUM.",
    },
    {
      id: "step-6-review",
      title: "Technical Report Compilation",
      description: "Analyst compiles findings into technical report",
      agentId: "analyst",
      targetPosition: [4, 0, 0],
      durationMs: 2500,
      outputLog:
        "→ Subsurface Analyst: Technical report compiled. 14 pages. Forwarding to Digital Strategist.",
    },
    {
      id: "step-7-strategy",
      title: "Strategic Leadership Briefing",
      description: "Strategist converts findings into executive action plan",
      agentId: "strategist",
      targetPosition: [6, 0, 2],
      durationMs: 4000,
      outputLog:
        "→ Digital Strategist: Translating geophysical findings into digital roadmap. Recommended investment: Tier-1 Exploration Block. ROI horizon: 18-24 months.",
    },
    {
      id: "step-8-presentation",
      title: "Board Presentation Delivery",
      description: "Executive strategy report delivered to leadership",
      agentId: "strategist",
      targetPosition: [6, 0, 4],
      durationMs: 3000,
      outputLog:
        "✓ WORKFLOW COMPLETE — Board briefing delivered. Full pipeline executed in 8 steps across 4 specialist agents.",
    },
  ],
};
