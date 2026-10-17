BEGIN;
CREATE TABLE IF NOT EXISTS public.learning_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 body text CHECK(length(body)<=40000),
 storage_path text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((body IS NOT NULL AND storage_path IS NULL) OR (body IS NULL AND storage_path IS NOT NULL)),
 CHECK(storage_path IS NULL OR split_part(storage_path,'/',1)=chapter_id::text)
);
ALTER TABLE public.learning_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sources_instructor ON public.learning_sources;
CREATE POLICY sources_instructor ON public.learning_sources FOR ALL TO authenticated
USING (EXISTS(SELECT 1 FROM public.chapters ch WHERE ch.id=chapter_id AND (public.is_admin() OR public.is_instructor_for_course(ch.course_id))))
WITH CHECK (EXISTS(SELECT 1 FROM public.chapters ch WHERE ch.id=chapter_id AND (public.is_admin() OR public.is_instructor_for_course(ch.course_id))));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.learning_sources TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('learning-sources','learning-sources',false,26214400,ARRAY['application/pdf'])
ON CONFLICT(id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_access_learning_file(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.chapters ch WHERE ch.id::text=split_part(object_name,'/',1)
 AND (public.is_admin() OR public.is_instructor_for_course(ch.course_id)));
$$;
REVOKE ALL ON FUNCTION public.can_access_learning_file(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_learning_file(text) TO authenticated;
DROP POLICY IF EXISTS learning_files_read ON storage.objects;
CREATE POLICY learning_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='learning-sources' AND public.can_access_learning_file(name));
DROP POLICY IF EXISTS learning_files_insert ON storage.objects;
CREATE POLICY learning_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='learning-sources' AND public.can_access_learning_file(name));
DROP POLICY IF EXISTS learning_files_delete ON storage.objects;
CREATE POLICY learning_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='learning-sources' AND public.can_access_learning_file(name));

CREATE OR REPLACE FUNCTION public.create_assigned_course(p_grade integer,p_title text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','instructor')) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'عنوان المادة غير صالح'; END IF;
 LOCK TABLE public.courses IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.courses WHERE grade_id=p_grade AND trim(title)=trim(p_title)) THEN RAISE EXCEPTION 'المادة موجودة في هذه المرحلة بالفعل'; END IF;
 INSERT INTO public.courses(grade_id,title,is_active) VALUES(p_grade,trim(p_title),true) RETURNING id INTO result;
 INSERT INTO public.instructor_courses(instructor_id,course_id) VALUES(auth.uid(),result);
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.create_assigned_course(integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_assigned_course(integer,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.generation_limits(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, day date NOT NULL, requests integer NOT NULL, last_request timestamptz NOT NULL);
ALTER TABLE public.generation_limits ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_generation_slot()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry public.generation_limits;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('instructor','admin')) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 INSERT INTO public.generation_limits VALUES(auth.uid(),current_date,0,'2000-01-01') ON CONFLICT DO NOTHING;
 SELECT * INTO entry FROM public.generation_limits WHERE user_id=auth.uid() FOR UPDATE;
 IF entry.last_request > now()-interval '1 minute' OR (entry.day=current_date AND entry.requests>=20) THEN RAISE EXCEPTION 'حد التوليد'; END IF;
 UPDATE public.generation_limits SET day=current_date, requests=CASE WHEN entry.day=current_date THEN entry.requests+1 ELSE 1 END,last_request=now() WHERE user_id=auth.uid();
END; $$;
REVOKE ALL ON FUNCTION public.claim_generation_slot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_generation_slot() TO authenticated;

CREATE TABLE IF NOT EXISTS public.question_sources (
 question_id uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
 source_id uuid NOT NULL REFERENCES public.learning_sources(id),
 source_page integer NOT NULL CHECK(source_page>0), source_quote text NOT NULL
);
ALTER TABLE public.question_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS question_sources_instructor ON public.question_sources;
CREATE POLICY question_sources_instructor ON public.question_sources FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.learning_sources s WHERE s.id=source_id));
GRANT SELECT ON public.question_sources TO authenticated;
CREATE OR REPLACE FUNCTION public.save_source_quiz(p_source uuid,p_title text,p_questions jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE src public.learning_sources; course uuid; quiz uuid; question uuid; q jsonb; idx integer := 0;
BEGIN
 SELECT * INTO src FROM public.learning_sources WHERE id=p_source;
 IF NOT FOUND THEN RAISE EXCEPTION 'المصدر غير موجود'; END IF;
 SELECT course_id INTO course FROM public.chapters WHERE id=src.chapter_id;
 IF auth.uid() IS NULL OR NOT (public.is_admin() OR public.is_instructor_for_course(course)) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
 IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 200 OR jsonb_typeof(p_questions) IS DISTINCT FROM 'array' OR jsonb_array_length(p_questions) NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'اختبار غير صالح'; END IF;
 INSERT INTO public.quizzes(chapter_id,title,is_active,pass_score) VALUES(src.chapter_id,trim(p_title),false,50) RETURNING id INTO quiz;
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
  IF coalesce(length(trim(q->>'question_text')),0)=0 OR coalesce(length(trim(q->>'explanation')),0)=0 OR coalesce(length(trim(q->>'source_quote')),0)=0 OR coalesce((q->>'source_page')::integer,0)<1 OR jsonb_typeof(q->'options')<>'array' THEN RAISE EXCEPTION 'سؤال غير مكتمل'; END IF;
  IF jsonb_array_length(q->'options') NOT IN (2,4) OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE o->>'key'=q->>'correct_answer') THEN RAISE EXCEPTION 'خيارات غير صالحة'; END IF;
  INSERT INTO public.questions(quiz_id,question_text,options,correct_answer,explanation,points,sort_order)
  VALUES(quiz,q->>'question_text',q->'options',q->>'correct_answer',(q->>'explanation') || E'\nالمصدر: ' || src.title || '، صفحة PDF ' || (q->>'source_page') || E'\nالشاهد: ' || (q->>'source_quote'),1,idx) RETURNING id INTO question;
  INSERT INTO public.question_sources VALUES(question,p_source,(q->>'source_page')::integer,q->>'source_quote');
  idx:=idx+1;
 END LOOP;
 RETURN quiz;
END; $$;
REVOKE ALL ON FUNCTION public.save_source_quiz(uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_source_quiz(uuid,text,jsonb) TO authenticated;
COMMIT;
