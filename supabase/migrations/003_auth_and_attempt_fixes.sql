-- Persist the two fixes applied during local setup. Safe to reapply.
BEGIN;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email), 'student'::public.user_role);
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS attempts_update_own ON public.student_quiz_attempts;
CREATE POLICY attempts_update_own ON public.student_quiz_attempts
FOR UPDATE TO authenticated
USING (student_id = auth.uid() AND submitted_at IS NULL)
WITH CHECK (student_id = auth.uid());
COMMIT;
