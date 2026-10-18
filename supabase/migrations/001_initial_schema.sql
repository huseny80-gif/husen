-- ============================================================
-- المنصة التعليمية للمرحلة الإعدادية - مخطط قاعدة البيانات
-- Educational Platform for Middle School - Database Schema
-- ============================================================

-- تفعيل ملحق UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. جدول الأدوار (Roles)
-- ============================================================
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');

-- إضافة عمود الدور إلى جدول المستخدمين في auth.users عبر profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    role        user_role NOT NULL DEFAULT 'student',
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. جدول المراحل الدراسية (Grades)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grades (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,               -- مثال: "الرابع الإعدادي"
    code        TEXT NOT NULL UNIQUE,        -- مثال: "G4", "G5", "G6"
    description TEXT,
    sort_order  INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- بيانات أولية للمراحل الدراسية
INSERT INTO public.grades (name, code, description, sort_order) VALUES
    ('الرابع الإعدادي',  'G4', 'المرحلة الرابعة الإعدادية',  1),
    ('الخامس الإعدادي', 'G5', 'المرحلة الخامسة الإعدادية', 2),
    ('السادس الإعدادي', 'G6', 'المرحلة السادسة الإعدادية', 3)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. جدول المواد الدراسية / البرامج التدريبية (Courses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_id    INT  NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    cover_url   TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. جدول ارتباط المدربين بالمواد (Instructor Courses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instructor_courses (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id     UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (instructor_id, course_id)
);

-- ============================================================
-- 5. جدول الفصول / الوحدات الدراسية (Chapters)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapters (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    sort_order  INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. جدول محتوى الفصل (Contents)
-- content_type: 'summary' | 'tip' | 'note' | 'video' | 'pdf'
-- ============================================================
CREATE TYPE content_type AS ENUM ('summary', 'tip', 'note', 'video', 'pdf');

CREATE TABLE IF NOT EXISTS public.contents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id   UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    content_type content_type NOT NULL DEFAULT 'summary',
    title        TEXT NOT NULL,
    body         TEXT,            -- نص الملخص أو النصيحة
    media_url    TEXT,            -- رابط الفيديو أو PDF
    sort_order   INT  NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. جدول الاختبارات التفاعلية (Quizzes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id      UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    time_limit_min  INT,       -- مدة الاختبار بالدقائق (NULL = بلا حد)
    pass_score      INT NOT NULL DEFAULT 50,  -- نسبة النجاح %
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. جدول أسئلة الاختبار (Questions)
-- options: مصفوفة JSON لخيارات الإجابة
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    options         JSONB NOT NULL,
    -- البنية: [{"key":"A","text":"..."}, {"key":"B","text":"..."}, ...]
    correct_answer  TEXT NOT NULL,   -- مفتاح الإجابة الصحيحة مثل "A" أو "B"
    explanation     TEXT,            -- التفسير العلمي للإجابة
    points          INT  NOT NULL DEFAULT 1,
    sort_order      INT  NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. جدول محاولات الاختبارات للطلاب (Student Quiz Attempts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    answers         JSONB NOT NULL DEFAULT '{}',
    -- البنية: {"question_uuid": "A", ...}
    score           INT  NOT NULL DEFAULT 0,   -- الدرجة المحققة
    total_points    INT  NOT NULL DEFAULT 0,   -- مجموع النقاط الكلي
    percentage      NUMERIC(5,2) NOT NULL DEFAULT 0,
    passed          BOOLEAN NOT NULL DEFAULT FALSE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMPTZ,
    time_taken_sec  INT  -- الوقت المستغرق بالثواني
);

-- ============================================================
-- دوال مساعدة (Helper Functions)
-- ============================================================

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- تطبيق trigger لتحديث updated_at
CREATE TRIGGER profiles_updated_at   BEFORE UPDATE ON public.profiles   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER courses_updated_at    BEFORE UPDATE ON public.courses    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER chapters_updated_at   BEFORE UPDATE ON public.chapters   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER contents_updated_at   BEFORE UPDATE ON public.contents   FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER quizzes_updated_at    BEFORE UPDATE ON public.quizzes    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- دالة إنشاء profile تلقائياً عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- دالة التحقق من صلاحية المدرب (Security Function)
-- is_instructor_for_course(course_uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_instructor_for_course(course_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.instructor_courses ic
        JOIN public.profiles p ON p.id = ic.instructor_id
        WHERE ic.course_id   = course_uuid
          AND ic.instructor_id = auth.uid()
          AND p.role IN ('instructor', 'admin')
    );
END;
$$;

-- دالة للتحقق من صلاحيات الادمن
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- دالة للتحقق من دور المستخدم
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- تفعيل Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_courses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- سياسات الأمان - Profiles
-- ============================================================
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- ============================================================
-- سياسات الأمان - Grades (للجميع قراءة)
-- ============================================================
CREATE POLICY "grades_select_all"
    ON public.grades FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "grades_admin_write"
    ON public.grades FOR ALL
    USING (is_admin());

-- ============================================================
-- سياسات الأمان - Courses
-- ============================================================
CREATE POLICY "courses_select_active"
    ON public.courses FOR SELECT
    TO authenticated
    USING (is_active = TRUE OR is_admin() OR is_instructor_for_course(id));

CREATE POLICY "courses_instructor_update"
    ON public.courses FOR UPDATE
    USING (is_instructor_for_course(id) OR is_admin());

CREATE POLICY "courses_admin_insert"
    ON public.courses FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "courses_admin_delete"
    ON public.courses FOR DELETE
    USING (is_admin());

-- ============================================================
-- سياسات الأمان - Instructor Courses
-- ============================================================
CREATE POLICY "ic_select_own"
    ON public.instructor_courses FOR SELECT
    USING (instructor_id = auth.uid() OR is_admin());

CREATE POLICY "ic_admin_manage"
    ON public.instructor_courses FOR ALL
    USING (is_admin());

-- ============================================================
-- سياسات الأمان - Chapters
-- ============================================================
CREATE POLICY "chapters_select_all"
    ON public.chapters FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "chapters_instructor_insert"
    ON public.chapters FOR INSERT
    WITH CHECK (is_instructor_for_course(course_id) OR is_admin());

CREATE POLICY "chapters_instructor_update"
    ON public.chapters FOR UPDATE
    USING (is_instructor_for_course(course_id) OR is_admin());

CREATE POLICY "chapters_instructor_delete"
    ON public.chapters FOR DELETE
    USING (is_instructor_for_course(course_id) OR is_admin());

-- ============================================================
-- سياسات الأمان - Contents
-- ============================================================
CREATE POLICY "contents_select_all"
    ON public.contents FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "contents_instructor_write"
    ON public.contents FOR INSERT
    WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

CREATE POLICY "contents_instructor_update"
    ON public.contents FOR UPDATE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

CREATE POLICY "contents_instructor_delete"
    ON public.contents FOR DELETE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

-- ============================================================
-- سياسات الأمان - Quizzes
-- ============================================================
CREATE POLICY "quizzes_select_active"
    ON public.quizzes FOR SELECT
    TO authenticated USING (is_active = TRUE OR is_admin());

CREATE POLICY "quizzes_instructor_write"
    ON public.quizzes FOR INSERT
    WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

CREATE POLICY "quizzes_instructor_update"
    ON public.quizzes FOR UPDATE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

-- ============================================================
-- سياسات الأمان - Questions
-- ============================================================
CREATE POLICY "questions_select_all"
    ON public.questions FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "questions_instructor_write"
    ON public.questions FOR INSERT
    WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.quizzes q
            JOIN public.chapters ch ON ch.id = q.chapter_id
            WHERE q.id = quiz_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

CREATE POLICY "questions_instructor_update"
    ON public.questions FOR UPDATE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.quizzes q
            JOIN public.chapters ch ON ch.id = q.chapter_id
            WHERE q.id = quiz_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

CREATE POLICY "questions_instructor_delete"
    ON public.questions FOR DELETE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.quizzes q
            JOIN public.chapters ch ON ch.id = q.chapter_id
            WHERE q.id = quiz_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

-- ============================================================
-- سياسات الأمان - Student Quiz Attempts
-- ============================================================
CREATE POLICY "attempts_select_own"
    ON public.student_quiz_attempts FOR SELECT
    USING (student_id = auth.uid() OR is_admin() OR EXISTS (
        SELECT 1 FROM public.quizzes q
        JOIN public.chapters ch ON ch.id = q.chapter_id
        WHERE q.id = quiz_id
        AND is_instructor_for_course(ch.course_id)
    ));

CREATE POLICY "attempts_insert_own"
    ON public.student_quiz_attempts FOR INSERT
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "attempts_update_own"
    ON public.student_quiz_attempts FOR UPDATE
    USING (student_id = auth.uid() AND submitted_at IS NULL);

-- ============================================================
-- Indexes لتحسين الأداء
-- ============================================================
CREATE INDEX idx_courses_grade         ON public.courses(grade_id);
CREATE INDEX idx_chapters_course       ON public.chapters(course_id);
CREATE INDEX idx_contents_chapter      ON public.contents(chapter_id);
CREATE INDEX idx_quizzes_chapter       ON public.quizzes(chapter_id);
CREATE INDEX idx_questions_quiz        ON public.questions(quiz_id);
CREATE INDEX idx_attempts_student      ON public.student_quiz_attempts(student_id);
CREATE INDEX idx_attempts_quiz         ON public.student_quiz_attempts(quiz_id);
CREATE INDEX idx_ic_instructor         ON public.instructor_courses(instructor_id);
CREATE INDEX idx_ic_course             ON public.instructor_courses(course_id);
