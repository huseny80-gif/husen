"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";

export function SimulationController() {
  const {
    isRunning,
    isPaused,
    currentStepIndex,
    currentWorkflow,
    logs,
    activeAgentId,
    agents,
    startWorkflow,
    nextStep,
    pauseWorkflow,
    resumeWorkflow,
    resetWorkflow,
  } = useSimulationStore();

  const logRef = useRef<HTMLDivElement>(null);
  const totalSteps = currentWorkflow.steps.length;
  const progress =
    currentStepIndex < 0 ? 0 : ((currentStepIndex + 1) / totalSteps) * 100;
  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const currentStep =
    currentStepIndex >= 0
      ? currentWorkflow.steps[currentStepIndex]
      : null;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        width: 420,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        zIndex: 100,
      }}
    >
      {/* Glass panel */}
      <div
        style={{
          background: "rgba(0, 20, 20, 0.82)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: 16,
          padding: 20,
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isRunning && !isPaused ? "#00e676" : "#546e7a",
              boxShadow: isRunning && !isPaused ? "0 0 8px #00e676" : "none",
            }}
          />
          <span
            style={{
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            The Delegation
          </span>
          <span
            style={{
              marginLeft: "auto",
              color: "#546e7a",
              fontSize: 11,
            }}
          >
            {currentStepIndex < 0
              ? "IDLE"
              : `STEP ${currentStepIndex + 1}/${totalSteps}`}
          </span>
        </div>

        {/* Workflow name */}
        <div
          style={{
            color: "#80cbc4",
            fontSize: 11,
            marginBottom: 10,
            opacity: 0.8,
          }}
        >
          {currentWorkflow.name}
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 3,
            background: "rgba(0, 77, 64, 0.4)",
            borderRadius: 2,
            marginBottom: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #004D40, #D4AF37)",
              borderRadius: 2,
              transition: "width 0.6s ease",
            }}
          />
        </div>

        {/* Active step info */}
        {currentStep && (
          <div
            style={{
              background: "rgba(0, 77, 64, 0.2)",
              border: "1px solid rgba(0, 77, 64, 0.4)",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 14,
            }}
          >
            <div
              style={{ color: "#D4AF37", fontSize: 11, marginBottom: 2 }}
            >
              {currentStep.title}
            </div>
            <div style={{ color: "#607d8b", fontSize: 10 }}>
              {currentStep.description}
            </div>
            {activeAgent && (
              <div
                style={{
                  marginTop: 4,
                  color: "#80cbc4",
                  fontSize: 10,
                }}
              >
                ⬡ Agent:{" "}
                <span style={{ color: activeAgent.color }}>
                  {activeAgent.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Control buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {/* Start / Resume */}
          {!isRunning ? (
            <button
              onClick={startWorkflow}
              style={buttonStyle("#004D40", "#D4AF37")}
            >
              ▶ Start
            </button>
          ) : (
            <button
              onClick={isPaused ? resumeWorkflow : pauseWorkflow}
              style={buttonStyle(
                isPaused ? "#1b5e20" : "#37474f",
                isPaused ? "#69f0ae" : "#90a4ae"
              )}
            >
              {isPaused ? "▶ Play" : "⏸ Pause"}
            </button>
          )}

          {/* Next Step */}
          <button
            onClick={nextStep}
            disabled={!isRunning || isPaused}
            style={buttonStyle(
              isRunning && !isPaused ? "#1a3a3a" : "#0d1f1f",
              isRunning && !isPaused ? "#80cbc4" : "#37474f"
            )}
          >
            ⏭ Next
          </button>

          {/* Skip to end placeholder */}
          <button
            onClick={() => {
              if (!isRunning) return;
              const remaining =
                currentWorkflow.steps.length - currentStepIndex - 1;
              for (let i = 0; i < remaining; i++) nextStep();
            }}
            disabled={!isRunning || isPaused}
            style={buttonStyle(
              isRunning && !isPaused ? "#1a2a1a" : "#0d1f1f",
              isRunning && !isPaused ? "#a5d6a7" : "#37474f"
            )}
          >
            ⏩ Finish
          </button>

          {/* Reset */}
          <button
            onClick={resetWorkflow}
            style={buttonStyle("#1a0a0a", "#ef5350")}
          >
            ↺ Reset
          </button>
        </div>

        {/* Terminal log */}
        <div
          style={{
            background: "rgba(0, 5, 5, 0.7)",
            border: "1px solid rgba(0, 77, 64, 0.3)",
            borderRadius: 8,
            padding: "8px 10px",
            height: 140,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#004D40 transparent",
          }}
          ref={logRef}
        >
          {logs.length === 0 ? (
            <span style={{ color: "#37474f", fontSize: 10 }}>
              _ Awaiting workflow start...
            </span>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: "#37474f", fontSize: 9, flexShrink: 0 }}>
                  {log.timestamp}
                </span>
                <span
                  style={{
                    color: log.message.startsWith("✓")
                      ? "#69f0ae"
                      : log.message.startsWith("▶")
                      ? "#D4AF37"
                      : "#80cbc4",
                    fontSize: 10,
                    wordBreak: "break-word",
                  }}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function buttonStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: `1px solid ${color}33`,
    borderRadius: 6,
    padding: "6px 4px",
    fontSize: 10,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "all 0.15s",
    letterSpacing: "0.03em",
  };
}
