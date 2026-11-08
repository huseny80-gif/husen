"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { AgentCharacter } from "./AgentCharacter";
import { CameraFollower } from "./CameraFollower";
import { OfficeEnvironment } from "./OfficeEnvironment";
import { useSimulationStore } from "@/store/useSimulationStore";

function SceneContent() {
  const agents = useSimulationStore((s) => s.agents);

  return (
    <>
      <CameraFollower />
      <OfficeEnvironment />
      {agents.map((agent) => (
        <AgentCharacter key={agent.id} agent={agent} />
      ))}
      <fog attach="fog" args={["#040e0e", 20, 50]} />
      <ambientLight intensity={0.3} color="#004D40" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#D4AF37" />
      <Environment preset="night" />
    </>
  );
}

export function DelegationScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 14], fov: 55, near: 0.1, far: 100 }}
      gl={{ antialias: true, toneMapping: 3 }}
      style={{ background: "#040e0e" }}
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
