'use client';

import { useEffect } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { DEMO_AGENTS, DEPARTMENTS, useSeismicStore, type Agent, type AgentStatus, type Department } from './useSeismicStore';

type Row = Database['public']['Tables']['seismic_agents']['Row'];
type Update = Database['public']['Tables']['seismic_agents']['Update'];

const HAS_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const STATUSES: AgentStatus[] = ['idle', 'working', 'alert', 'success'];

// lib/supabase يرمي خطأ عند غياب المتغيرات، لذا يُحمَّل كسولاً فقط عند توفرها
let clientPromise: Promise<SupabaseClient<Database>> | null = null;
const getClient = () => (clientPromise ??= import('@/lib/supabase').then((m) => m.supabase));

export function rowToAgent(r: Row): Agent {
  return {
    id: r.id,
    name: r.name,
    department: (DEPARTMENTS as readonly string[]).includes(r.department) ? (r.department as Department) : 'AI Analytics',
    status: STATUSES.includes(r.status as AgentStatus) ? (r.status as AgentStatus) : 'idle',
    currentTask: r.current_task,
    position: [r.pos_x, 0, r.pos_z],
    progress: r.progress,
    taskStartedAt: r.task_started_at ? Date.parse(r.task_started_at) : null,
    taskDurationMs: r.task_duration_ms,
  };
}

export function deriveProgress(a: Agent, now = Date.now()): number {
  if (a.status !== 'working' || a.taskStartedAt == null) return a.progress;
  return Math.max(0, Math.min(100, ((now - a.taskStartedAt) / a.taskDurationMs) * 100));
}

/** Applies a patch locally and, in live mode, persists it. Returns an error message or null. */
async function writeAgent(id: string, patch: Update, local: Partial<Agent>, guardStartedAt?: string): Promise<string | null> {
  const store = useSeismicStore.getState();
  if (store.mode === 'demo') {
    store.patchAgent(id, local);
    return null;
  }
  const previous = store.agents.find((a) => a.id === id);
  store.patchAgent(id, local); // تحديث متفائل؛ Realtime سيؤكده

  const supabase = await getClient();
  let q = supabase.from('seismic_agents').update(patch).eq('id', id);
  if (guardStartedAt) q = q.eq('task_started_at', guardStartedAt); // إنهاء متكرر من عدة متصفحات لا يضر
  const { data, error } = await q.select('id');

  if (error || (!guardStartedAt && (data?.length ?? 0) === 0)) {
    if (previous) store.patchAgent(id, previous);
    const msg = error?.message ?? 'لم يُحفظ التعديل: تحتاج صلاحية مدرب أو مشرف.';
    store.setMeta({ error: msg });
    return msg;
  }
  return null;
}

export function startFieldTask(id: string) {
  const startedAt = new Date();
  const x = Math.round((Math.random() - 0.5) * 20);
  const z = Math.round((Math.random() - 0.5) * 20);
  const task = 'جارٍ تنفيذ مسح تحديث الإحداثيات الحقلية...';
  return writeAgent(
    id,
    { status: 'working', current_task: task, progress: 0, pos_x: x, pos_z: z, task_started_at: startedAt.toISOString() },
    { status: 'working', currentTask: task, progress: 0, position: [x, 0, z], taskStartedAt: startedAt.getTime() },
  );
}

function completeFieldTask(a: Agent) {
  const task = 'اكتملت المزامنة بنجاح عبر السيرفر المركزي';
  return writeAgent(
    a.id,
    { status: 'success', current_task: task, progress: 100, task_started_at: null },
    { status: 'success', currentTask: task, progress: 100, taskStartedAt: null },
    a.taskStartedAt != null ? new Date(a.taskStartedAt).toISOString() : undefined,
  );
}

/**
 * Mount once per page: loads agents, subscribes to Realtime, and ticks derived progress.
 * Falls back to local demo data when Supabase env vars are missing.
 */
export function useSeismicLiveSync() {
  useEffect(() => {
    const store = useSeismicStore.getState();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    const completing = new Set<string>();
    let cleanupAuth = () => {};

    const tick = setInterval(() => {
      const s = useSeismicStore.getState();
      const now = Date.now();
      for (const a of s.agents) {
        if (a.status !== 'working' || a.taskStartedAt == null) continue;
        const p = deriveProgress(a, now);
        if (p >= 100) {
          if (s.canControl && !completing.has(a.id)) {
            completing.add(a.id);
            void completeFieldTask(a).finally(() => completing.delete(a.id));
          }
        } else if (Math.abs(p - a.progress) >= 0.5) {
          s.patchAgent(a.id, { progress: p });
        }
      }
    }, 100);

    if (!HAS_SUPABASE) {
      store.replaceAll(DEMO_AGENTS.map((a) => ({ ...a })));
      store.setMeta({ mode: 'demo', canControl: true, error: null });
      return () => clearInterval(tick);
    }

    (async () => {
      const supabase = await getClient();

      const refreshRole = async () => {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return useSeismicStore.getState().setMeta({ canControl: false });
        const { data: role } = await supabase.rpc('get_user_role');
        useSeismicStore.getState().setMeta({ canControl: role === 'instructor' || role === 'admin' });
      };

      const load = async () => {
        const { data, error } = await supabase.from('seismic_agents').select('*').order('id');
        if (cancelled) return;
        if (error) return useSeismicStore.getState().setMeta({ mode: 'live', error: error.message });
        useSeismicStore.getState().replaceAll((data ?? []).map(rowToAgent));
        useSeismicStore.getState().setMeta({ mode: 'live', error: null });
      };

      // الاشتراك قبل التحميل حتى لا يضيع تغيير يقع بينهما
      channel = supabase
        .channel('seismic_agents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seismic_agents' }, (payload) => {
          const s = useSeismicStore.getState();
          if (payload.eventType === 'DELETE') s.removeAgent((payload.old as Partial<Row>).id!);
          else s.upsertAgent(rowToAgent(payload.new as Row));
        })
        .subscribe((status) => {
          // بعد انقطاع وعودة الاتصال نعيد التحميل لالتقاط ما فات
          if (status === 'SUBSCRIBED') void load();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
            useSeismicStore.getState().setMeta({ error: 'انقطع البث المباشر، جارٍ إعادة الاتصال...' });
        });

      const { data: authSub } = supabase.auth.onAuthStateChange(() => void refreshRole());
      await refreshRole();
      if (cancelled) authSub.subscription.unsubscribe();
      else cleanupAuth = () => authSub.subscription.unsubscribe();
    })().catch((e: unknown) => useSeismicStore.getState().setMeta({ mode: 'live', error: String(e) }));

    return () => {
      cancelled = true;
      clearInterval(tick);
      cleanupAuth();
      if (channel) void getClient().then((c) => c.removeChannel(channel!));
    };
  }, []);
}
