'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSeismicStore, type Agent } from './useSeismicStore';

const STATUS_COLOR: Record<Agent['status'], string> = {
  success: '#00C853', // أخضر نجاح
  alert: '#FFD700', // ذهبي تحذيري
  working: '#00897B', // فيروزي تشغيلي
  idle: '#78909C',
};

function AgentAvatar({ agent }: { agent: Agent }) {
  // الحركة تُطبَّق على المجموعة كاملة حتى تتبع اللوحة العائمة الوكيلَ،
  // والموضع الابتدائي يُضبط مرة واحدة فقط ثم يتولى lerp الانتقال.
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const phase = useRef(Math.random() * Math.PI * 2);
  const visible = useSeismicStore(
    (s) => s.activeDepartment === 'All' || s.activeDepartment === agent.department,
  );

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (g) {
      // lerp مستقل عن معدل الإطارات
      const t = 1 - Math.exp(-delta * 3);
      g.position.x = THREE.MathUtils.lerp(g.position.x, agent.position[0], t);
      g.position.z = THREE.MathUtils.lerp(g.position.z, agent.position[2], t);
    }
    const b = bodyRef.current;
    if (b) {
      // نبض خفيف أثناء العمل، وعودة هادئة للأرض في غير ذلك
      const targetY =
        agent.status === 'working' ? 1 + Math.sin(state.clock.elapsedTime * 3 + phase.current) * 0.1 : 1;
      b.position.y = THREE.MathUtils.lerp(b.position.y, targetY, 0.2);
    }
  });

  return (
    <group ref={groupRef} position={agent.position} visible={visible}>
      {/* الكبسولة طولها 2.0 (1.2 + 2×0.4)، لذا ترفع 1 لتقف على الأرض */}
      <mesh ref={bodyRef} position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.4, 1.2, 4, 16]} />
        <meshStandardMaterial color={STATUS_COLOR[agent.status]} roughness={0.3} metalness={0.8} />
      </mesh>

      {visible && (
        <Html position={[0, 2.6, 0]} center>
          <div
            dir="rtl"
            style={{
              background: 'rgba(0, 77, 64, 0.85)',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 11,
              border: '1px solid #FFD700',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}
          >
            <strong>{agent.name}</strong>
            <div style={{ fontSize: 9, color: '#B2DFDB' }}>{agent.currentTask}</div>
            <div style={{ height: 3, background: '#001A17', borderRadius: 2, marginTop: 4 }}>
              <div
                style={{
                  width: `${agent.progress}%`,
                  height: '100%',
                  background: STATUS_COLOR[agent.status],
                  borderRadius: 2,
                  transition: 'width 300ms',
                }}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function SeismicOfficeScene() {
  const agents = useSeismicStore((s) => s.agents);

  return (
    // dir="ltr" ضروري: مكوّن Html في drei يحسب الإزاحة على افتراض اتجاه LTR
    <div dir="ltr" style={{ width: '100%', height: 550, background: '#001A17', borderRadius: 12, overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 8, 14], fov: 50 }} shadows dpr={[1, 2]}>
        <color attach="background" args={['#001A17']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 15]} intensity={1.2} castShadow />

        {/* أرضية المكتب الافتراضي للفرقة الزلزالية السابعة */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#00332C" roughness={0.9} />
        </mesh>

        {/* شبكة خطوط الإحداثيات والمسح */}
        <gridHelper args={[30, 30, '#FFD700', '#004D40']} position={[0, 0.01, 0]} />

        {agents.map((agent) => (
          <AgentAvatar key={agent.id} agent={agent} />
        ))}

        <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
    </div>
  );
}
