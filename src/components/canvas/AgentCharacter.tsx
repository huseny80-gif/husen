"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { AgentState } from "@/store/useSimulationStore";

interface AgentCharacterProps {
  agent: AgentState;
}

export function AgentCharacter({ agent }: AgentCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(...agent.initialPosition));
  const currentPos = useRef(new THREE.Vector3(...agent.initialPosition));
  const prevPos = useRef(new THREE.Vector3(...agent.initialPosition));
  const targetRotY = useRef(0);

  const agentColor = useMemo(() => new THREE.Color(agent.color), [agent.color]);
  const goldColor = new THREE.Color("#D4AF37");
  const glowColor = new THREE.Color(agent.isActive ? "#D4AF37" : agent.color);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    targetPos.current.set(...agent.position);

    const lerpFactor = 1 - Math.pow(0.001, delta);
    currentPos.current.lerp(targetPos.current, lerpFactor);

    const dx = currentPos.current.x - prevPos.current.x;
    const dz = currentPos.current.z - prevPos.current.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      targetRotY.current = Math.atan2(dx, dz);
    }

    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY.current,
      lerpFactor
    );

    prevPos.current.copy(currentPos.current);
  });

  return (
    <group ref={groupRef} position={agent.initialPosition}>
      {/* Body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.8, 8, 16]} />
        <meshStandardMaterial
          color={agentColor}
          metalness={0.6}
          roughness={0.3}
          emissive={agent.isActive ? glowColor : new THREE.Color("#000000")}
          emissiveIntensity={agent.isActive ? 0.4 : 0}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={agentColor}
          metalness={0.7}
          roughness={0.2}
          emissive={agent.isActive ? goldColor : new THREE.Color("#000000")}
          emissiveIntensity={agent.isActive ? 0.5 : 0}
        />
      </mesh>

      {/* Gold ring accent (active indicator) */}
      {agent.isActive && (
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.04, 8, 32]} />
          <meshStandardMaterial
            color={goldColor}
            emissive={goldColor}
            emissiveIntensity={1.5}
            metalness={1}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Point light for active agents */}
      {agent.isActive && (
        <pointLight color="#D4AF37" intensity={2} distance={3} decay={2} />
      )}

      {/* Name label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, 2.1, 0]}
          fontSize={0.18}
          color={agent.isActive ? "#D4AF37" : "#a0a0a0"}
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          {agent.name}
        </Text>
        <Text
          position={[0, 1.85, 0]}
          fontSize={0.12}
          color="#607d8b"
          anchorX="center"
          anchorY="middle"
        >
          {agent.role}
        </Text>
      </Billboard>
    </group>
  );
}
