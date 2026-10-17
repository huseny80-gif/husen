-- ============================================================
-- 002 - الاختبارات التفاعلية المستخلصة من محتوى المادة
-- شغّل هذا الملف بعد 001_initial_schema.sql
-- نص المادة الدراسية يُحفظ في جدول contents (content_type = 'summary')
-- ============================================================

-- 1) توسيع جدول الأسئلة: نوع السؤال + ربطه بنص المصدر
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS question_type     TEXT NOT NULL DEFAULT 'mcq'
        CHECK (question_type IN ('mcq', 'true_false')),
    ADD COLUMN IF NOT EXISTS source_content_id UUID
        REFERENCES public.contents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_excerpt    TEXT;   -- الجملة التي استُخلص منها السؤال

CREATE INDEX IF NOT EXISTS idx_questions_source ON public.questions(source_content_id);

-- 2) سياسات إضافية للاختبارات (المدرب يرى اختباراته غير المفعّلة ويحذفها)
DROP POLICY IF EXISTS "quizzes_instructor_select" ON public.quizzes;
CREATE POLICY "quizzes_instructor_select"
    ON public.quizzes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );

DROP POLICY IF EXISTS "quizzes_instructor_delete" ON public.quizzes;
CREATE POLICY "quizzes_instructor_delete"
    ON public.quizzes FOR DELETE
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM public.chapters ch
            WHERE ch.id = chapter_id
            AND is_instructor_for_course(ch.course_id)
        )
    );
