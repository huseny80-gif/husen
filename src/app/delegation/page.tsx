import dynamic from "next/dynamic";
import { SimulationController } from "@/components/ui/SimulationController";

export const dynamic = "force-dynamic";

// R3F Canvas must be client-only — dynamic import with no SSR
const DelegationScene = dynamic(
  () =>
    import("@/components/canvas/DelegationScene").then(
      (m) => m.DelegationScene
    ),
  { ssr: false }
);

export default function DelegationPage() {
  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#040e0e" }}>
      {/* Full-screen 3D canvas */}
      <div style={{ position: "absolute", inset: 0 }}>
        <DelegationScene />
      </div>

      {/* Overlay UI */}
      <SimulationController />

      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background:
            "linear-gradient(to bottom, rgba(4,14,14,0.9) 0%, transparent 100%)",
          zIndex: 50,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span
          style={{
            color: "#D4AF37",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          THE DELEGATION
        </span>
        <span style={{ color: "#004D40", fontSize: 12 }}>|</span>
        <span style={{ color: "#546e7a", fontSize: 11 }}>
          Seismic DGPS · Multi-Agent Workflow Engine
        </span>
      </div>
    </main>
  );
}
