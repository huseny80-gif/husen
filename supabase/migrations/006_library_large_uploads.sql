-- Requires migration 005 and a project global file limit of at least 2 GiB.
-- The global limit must be configured in the Supabase dashboard.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'course-library') THEN
  RAISE EXCEPTION 'Apply 005_course_library.sql first';
 END IF;
 UPDATE storage.buckets SET file_size_limit = 2147483648 WHERE id = 'course-library';
END $$;
