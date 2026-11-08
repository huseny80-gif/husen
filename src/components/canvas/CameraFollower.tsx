"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSimulationStore } from "@/store/useSimulationStore";

const CAMERA_OFFSET = new THREE.Vector3(0, 5, 10);
const LERP_SPEED = 0.04;

export function CameraFollower() {
  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 8, 14));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const smoothLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const { agents, activeAgentId, isRunning } = useSimulationStore();

  useFrame(() => {
    if (!isRunning || !activeAgentId) {
      // Default overview position
      targetCamPos.current.set(0, 10, 16);
      targetLookAt.current.set(0, 0, 0);
    } else {
      const activeAgent = agents.find((a) => a.id === activeAgentId);
      if (activeAgent) {
        const [ax, ay, az] = activeAgent.position;
        targetCamPos.current.set(
          ax + CAMERA_OFFSET.x,
          ay + CAMERA_OFFSET.y,
          az + CAMERA_OFFSET.z
        );
        targetLookAt.current.set(ax, ay + 1, az);
      }
    }

    camera.position.lerp(targetCamPos.current, LERP_SPEED);
    smoothLookAt.current.lerp(targetLookAt.current, LERP_SPEED);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
}
