-- Allow assigned instructors to read their inactive quizzes (drafts).
-- Existing student visibility and all other policies remain unchanged.
BEGIN;
DROP POLICY IF EXISTS quizzes_instructor_select ON public.quizzes;
CREATE POLICY quizzes_instructor_select
ON public.quizzes FOR SELECT TO authenticated
USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.chapters AS ch
    WHERE ch.id = quizzes.chapter_id
      AND public.is_instructor_for_course(ch.course_id)
  )
);
COMMIT;
