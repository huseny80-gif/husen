BEGIN;
CREATE TABLE IF NOT EXISTS public.course_library (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
 storage_path text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (split_part(storage_path, '/', 1) = course_id::text)
);
ALTER TABLE public.course_library ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.course_library TO authenticated;
DROP POLICY IF EXISTS library_read ON public.course_library;
CREATE POLICY library_read ON public.course_library FOR SELECT TO authenticated
 USING (public.is_admin() OR public.is_instructor_for_course(course_id));
DROP POLICY IF EXISTS library_insert ON public.course_library;
CREATE POLICY library_insert ON public.course_library FOR INSERT TO authenticated
 WITH CHECK (public.is_admin() OR public.is_instructor_for_course(course_id));
CREATE OR REPLACE FUNCTION public.can_access_course_library(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = split_part(p_name, '/', 1)
 AND (public.is_admin() OR public.is_instructor_for_course(c.id)));
$$;
REVOKE ALL ON FUNCTION public.can_access_course_library(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course_library(text) TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('course-library','course-library',false,26214400,ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS course_library_files_read ON storage.objects;
CREATE POLICY course_library_files_read ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id = 'course-library' AND public.can_access_course_library(name));
DROP POLICY IF EXISTS course_library_files_insert ON storage.objects;
CREATE POLICY course_library_files_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id = 'course-library' AND public.can_access_course_library(name));
COMMIT;
