"use client";

import * as THREE from "three";

const DESK_COLOR = new THREE.Color("#1a2a2a");
const FLOOR_COLOR = new THREE.Color("#0d1a1a");
const GRID_COLOR = new THREE.Color("#004D40");

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.6, 0.06, 0.8]} />
        <meshStandardMaterial color={DESK_COLOR} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Legs */}
      {(
        [
          [-0.72, 0, -0.35],
          [0.72, 0, -0.35],
          [-0.72, 0, 0.35],
          [0.72, 0, 0.35],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial color="#0a1515" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      {/* Monitor glow */}
      <mesh position={[0, 0.75, -0.25]}>
        <boxGeometry args={[0.8, 0.5, 0.04]} />
        <meshStandardMaterial
          color="#001a1a"
          emissive={GRID_COLOR}
          emissiveIntensity={0.6}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
}

export function OfficeEnvironment() {
  const deskPositions: [number, number, number][] = [
    [-6, 0, -4],
    [-2, 0, -4],
    [2, 0, -4],
    [6, 0, -4],
  ];

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color={FLOOR_COLOR} metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Grid overlay */}
      <gridHelper
        args={[30, 30, GRID_COLOR, new THREE.Color("#002929")]}
        position={[0, 0.001, 0]}
      />

      {/* Desks */}
      {deskPositions.map((pos, i) => (
        <Desk key={i} position={pos} />
      ))}

      {/* Ambient gold ceiling light strips */}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <mesh key={i} position={[x, 4.5, 0]}>
          <boxGeometry args={[0.1, 0.05, 12]} />
          <meshStandardMaterial
            color="#D4AF37"
            emissive={new THREE.Color("#D4AF37")}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Walls (subtle) */}
      <mesh position={[0, 2.5, -8]} receiveShadow>
        <planeGeometry args={[30, 5]} />
        <meshStandardMaterial color="#061010" roughness={1} />
      </mesh>
    </group>
  );
}
