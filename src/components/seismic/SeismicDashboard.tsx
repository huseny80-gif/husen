'use client';

import { useEffect, useRef } from 'react';
import { useSeismicStore, type Department } from './useSeismicStore';

const DEPARTMENTS: (Department | 'All')[] = ['All', 'DGPS & Survey', 'Seismic Operations', 'HSE Safety', 'AI Analytics'];
const TASK_DURATION_MS = 3000;
const TICK_MS = 100;

export default function SeismicDashboard() {
  const agents = useSeismicStore((s) => s.agents);
  const activeDepartment = useSeismicStore((s) => s.activeDepartment);
  const setDepartment = useSeismicStore((s) => s.setDepartment);
  const updateAgentTask = useSeismicStore((s) => s.updateAgentTask);
  const setAgentProgress = useSeismicStore((s) => s.setAgentProgress);
  const moveAgent = useSeismicStore((s) => s.moveAgent);

  // مؤقت واحد لكل وكيل: يمنع تداخل النقرات المتكررة ويُنظَّف عند مغادرة الصفحة
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearInterval);
  }, []);

  const handleSimulateTask = (id: string) => {
    if (timers.current.has(id)) return;

    updateAgentTask(id, 'جارٍ تنفيذ مسح تحديث الإحداثيات الحقلية...', 'working');
    setAgentProgress(id, 0);
    // انتقال الوكيل إلى نقطة مسح جديدة داخل حدود الأرضية
    moveAgent(id, [Math.round((Math.random() - 0.5) * 20), 0, Math.round((Math.random() - 0.5) * 20)]);

    const start = Date.now();
    const handle = setInterval(() => {
      const pct = ((Date.now() - start) / TASK_DURATION_MS) * 100;
      if (pct >= 100) {
        clearInterval(handle);
        timers.current.delete(id);
        setAgentProgress(id, 100);
        updateAgentTask(id, 'اكتملت المزامنة بنجاح عبر السيرفر المركزي', 'success');
      } else {
        setAgentProgress(id, pct);
      }
    }, TICK_MS);
    timers.current.set(id, handle);
  };

  const shown = agents.filter((a) => activeDepartment === 'All' || a.department === activeDepartment);

  return (
    <div
      style={{
        background: '#002521',
        border: '1px solid #004D40',
        borderRadius: 12,
        padding: 20,
        color: '#FFF',
      }}
    >
      <h3 style={{ color: '#FFD700', marginTop: 0, borderBottom: '1px solid #004D40', paddingBottom: 10 }}>
        لوحة تحكم الوكلاء الأذكياء - الفرقة الزلزالية السابعة
      </h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => setDepartment(d)}
            aria-pressed={activeDepartment === d}
            style={{
              background: activeDepartment === d ? '#FFD700' : 'transparent',
              color: activeDepartment === d ? '#002521' : '#B2DFDB',
              border: '1px solid #FFD700',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {d === 'All' ? 'الكل' : d}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15, marginTop: 15 }}>
        {shown.map((agent) => {
          const busy = timers.current.has(agent.id);
          return (
            <div key={agent.id} style={{ background: '#00332C', border: '1px solid #004D40', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#FFD700' }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: '#B2DFDB', margin: '4px 0 10px 0' }}>{agent.department}</div>
              <div style={{ fontSize: 12, background: '#001A17', padding: 6, borderRadius: 4, marginBottom: 6 }}>
                {agent.currentTask}
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(agent.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ height: 4, background: '#001A17', borderRadius: 2, marginBottom: 10 }}
              >
                <div style={{ width: `${agent.progress}%`, height: '100%', background: '#FFD700', borderRadius: 2 }} />
              </div>
              <button
                onClick={() => handleSimulateTask(agent.id)}
                disabled={busy}
                style={{
                  background: busy ? '#78909C' : '#FFD700',
                  color: '#002521',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 4,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  width: '100%',
                  fontSize: 12,
                }}
              >
                {busy ? `قيد التنفيذ ${Math.round(agent.progress)}%` : 'تشغيل مهمة ميدانية'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
