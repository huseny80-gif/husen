-- =============================================================
-- 007: وكلاء الفرقة الزلزالية السابعة — بيانات حية لصفحة /seismic
-- القراءة متاحة للجميع (لوحة عرض)، والتعديل للمدرب/المشرف فقط.
-- التقدم لا يُكتب كل ثانية: يُشتق في المتصفح من task_started_at و task_duration_ms.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.seismic_agents (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    department        TEXT NOT NULL CHECK (department IN ('DGPS & Survey', 'Seismic Operations', 'HSE Safety', 'AI Analytics')),
    status            TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'alert', 'success')),
    current_task      TEXT NOT NULL DEFAULT '',
    pos_x             REAL NOT NULL DEFAULT 0 CHECK (pos_x BETWEEN -15 AND 15),
    pos_z             REAL NOT NULL DEFAULT 0 CHECK (pos_z BETWEEN -15 AND 15),
    progress          SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    task_started_at   TIMESTAMPTZ,
    task_duration_ms  INTEGER NOT NULL DEFAULT 3000 CHECK (task_duration_ms BETWEEN 500 AND 3600000),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.seismic_agents_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seismic_agents_touch ON public.seismic_agents;
CREATE TRIGGER seismic_agents_touch
    BEFORE UPDATE ON public.seismic_agents
    FOR EACH ROW EXECUTE FUNCTION public.seismic_agents_touch();

ALTER TABLE public.seismic_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seismic_agents_read" ON public.seismic_agents;
CREATE POLICY "seismic_agents_read" ON public.seismic_agents
    FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS "seismic_agents_staff_write" ON public.seismic_agents;
CREATE POLICY "seismic_agents_staff_write" ON public.seismic_agents
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('instructor', 'admin'))
    WITH CHECK (public.get_user_role() IN ('instructor', 'admin'));

-- بث التغييرات عبر Supabase Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'seismic_agents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.seismic_agents;
    END IF;
END;
$$;

INSERT INTO public.seismic_agents (id, name, department, status, current_task, pos_x, pos_z, progress) VALUES
    ('agent-1', 'مهندس DGPS الرئيسي',     'DGPS & Survey',      'working', 'معايرة إحداثيات الـ Leica GS18',        0,  0,  85),
    ('agent-2', 'مسؤول الحفر والتنقيب',    'Seismic Operations', 'working', 'متابعة شاحنات النماد Nomad 65 Neo',     5, -5,  62),
    ('agent-3', 'ضابط سلامة الحقل (HSE)', 'HSE Safety',         'success', 'تدقيق معايير البيئة الصحراوية',        -5,  5, 100),
    ('agent-4', 'محلل البيانات الزلزالية', 'AI Analytics',       'working', 'معالجة العقد اللاسلكية Wireless Nodes',  3,  5,  45)
ON CONFLICT (id) DO NOTHING;
