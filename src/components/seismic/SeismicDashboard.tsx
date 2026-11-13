'use client';

import { useState } from 'react';
import { DEPARTMENTS, useSeismicStore, type Department } from './useSeismicStore';
import { startFieldTask } from './seismicSync';

const FILTERS: (Department | 'All')[] = ['All', ...DEPARTMENTS];

const MODE_LABEL = {
  loading: { text: 'جارٍ الاتصال...', color: '#78909C' },
  live: { text: '● مباشر من Supabase', color: '#00C853' },
  demo: { text: 'وضع تجريبي (بدون Supabase)', color: '#FFD700' },
} as const;

export default function SeismicDashboard() {
  const agents = useSeismicStore((s) => s.agents);
  const activeDepartment = useSeismicStore((s) => s.activeDepartment);
  const setDepartment = useSeismicStore((s) => s.setDepartment);
  const mode = useSeismicStore((s) => s.mode);
  const canControl = useSeismicStore((s) => s.canControl);
  const error = useSeismicStore((s) => s.error);
  const setMeta = useSeismicStore((s) => s.setMeta);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const handleStart = async (id: string) => {
    setPending((p) => new Set(p).add(id));
    setMeta({ error: null });
    await startFieldTask(id);
    setPending((p) => {
      const n = new Set(p);
      n.delete(id);
      return n;
    });
  };

  const shown = agents.filter((a) => activeDepartment === 'All' || a.department === activeDepartment);
  const badge = MODE_LABEL[mode];

  return (
    <div style={{ background: '#002521', border: '1px solid #004D40', borderRadius: 12, padding: 20, color: '#FFF' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderBottom: '1px solid #004D40', paddingBottom: 10 }}>
        <h3 style={{ color: '#FFD700', margin: 0 }}>لوحة تحكم الوكلاء الأذكياء - الفرقة الزلزالية السابعة</h3>
        <span style={{ fontSize: 12, color: badge.color }}>{badge.text}</span>
      </div>

      {mode === 'live' && !canControl && (
        <p style={{ fontSize: 12, color: '#B2DFDB', margin: '10px 0 0' }}>
          تعرض اللوحة البيانات الحية للجميع. لتشغيل المهام <a href="/login" style={{ color: '#FFD700' }}>سجّل الدخول بحساب مدرب أو مشرف</a>.
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: 12, color: '#FFAB91', margin: '10px 0 0' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {FILTERS.map((d) => (
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

      {mode === 'loading' ? (
        <p style={{ color: '#B2DFDB', fontSize: 13 }}>جارٍ تحميل الوكلاء...</p>
      ) : shown.length === 0 ? (
        <p style={{ color: '#B2DFDB', fontSize: 13 }}>لا يوجد وكلاء في هذا القسم.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15, marginTop: 15 }}>
          {shown.map((agent) => {
            const running = agent.status === 'working' && agent.taskStartedAt != null;
            const busy = running || pending.has(agent.id);
            const disabled = busy || !canControl;
            return (
              <div key={agent.id} style={{ background: '#00332C', border: '1px solid #004D40', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 'bold', color: '#FFD700' }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: '#B2DFDB', margin: '4px 0 10px 0' }}>{agent.department}</div>
                <div style={{ fontSize: 12, background: '#001A17', padding: 6, borderRadius: 4, marginBottom: 6 }}>{agent.currentTask}</div>
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
                  onClick={() => handleStart(agent.id)}
                  disabled={disabled}
                  title={!canControl ? 'يتطلب صلاحية مدرب أو مشرف' : undefined}
                  style={{
                    background: disabled ? '#78909C' : '#FFD700',
                    color: '#002521',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 4,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    width: '100%',
                    fontSize: 12,
                  }}
                >
                  {running ? `قيد التنفيذ ${Math.round(agent.progress)}%` : 'تشغيل مهمة ميدانية'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
