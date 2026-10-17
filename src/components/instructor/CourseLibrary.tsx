'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Course } from '@/lib/types';

type Entry = { id: string; title: string; storage_path: string };
export function CourseLibrary({ courses, gradeSelected }: { courses: Course[]; gradeSelected: boolean }) {
  const [courseId, setCourseId] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const validCourse = courses.some(c => c.id === courseId) ? courseId : '';
  useEffect(() => {
    let active = true;
    setEntries([]); setMessage('');
    if (validCourse) {
      supabase.from('course_library').select('id,title,storage_path').eq('course_id', validCourse).order('created_at', { ascending: false }).then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage('تعذر تحميل المكتبة: ' + error.message);
        else setEntries((data ?? []) as Entry[]);
      });
    }
    return () => { active = false; };
  }, [validCourse, refresh]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !file || !validCourse || !title.trim()) return;
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 25 * 1024 * 1024 || file.size === 0) { setMessage('اختر ملف PDF غير فارغ بحجم أقصى 25 ميغابايت.'); return; }
    const form = event.currentTarget;
    setBusy(true); setMessage('جارٍ رفع الكتاب، أبقِ الصفحة مفتوحة…');
    const path = `${validCourse}/${crypto.randomUUID()}.pdf`;
    try {
      const { error: uploadError } = await supabase.storage.from('course-library').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('course_library').insert({ course_id: validCourse, title: title.trim(), storage_path: path }).select('id').single();
      if (error) throw error;
      setTitle(''); setFile(null); form.reset(); setRefresh(n => n + 1);
      setMessage('حُفظ الكتاب داخل المنصة. يمكنك فتحه من أي جهاز بعد تسجيل الدخول.');
    } catch (error) { setMessage('لم يتم تأكيد الحفظ: ' + (error instanceof Error ? error.message : String((error as {message?: string}).message ?? error))); }
    finally { setBusy(false); }
  }
  async function open(entry: Entry) {
    const viewer = window.open('about:blank', '_blank');
    if (viewer) viewer.opener = null;
    const { data, error } = await supabase.storage.from('course-library').createSignedUrl(entry.storage_path, 600);
    if (error || !data) { viewer?.close(); setMessage('تعذر فتح الملف. أعد المحاولة.'); return; }
    if (viewer) viewer.location.href = data.signedUrl;
    else setMessage('اسمح بفتح نافذة جديدة لعرض الكتاب.');
  }
  return <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="مكتبة المواد">
    <h2 className="text-xl font-bold mb-2">مكتبة المواد</h2>
    <p className="text-gray-600 mb-4">ارفع الكتاب مرة واحدة من الهاتف أو الآيباد أو الحاسوب. يُحفظ في المنصة، ولا تحتاج لإعادة رفعه عند تغيير الجهاز. المكتبة خاصة بالمدرب حاليًا.</p>
    {!gradeSelected ? <p>اختر المرحلة الدراسية أولًا.</p> : <>
      <label className="block">المادة الدراسية<select disabled={busy} value={validCourse} onChange={e => setCourseId(e.target.value)} className="block w-full border rounded-xl p-3 my-2"><option value="">اختر المادة</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      {validCourse && <>
        <form onSubmit={save} className="space-y-3 my-5">
          <label className="block">عنوان الكتاب<input required maxLength={200} disabled={busy} value={title} onChange={e => setTitle(e.target.value)} className="block w-full border rounded-xl p-3" /></label>
          <label className="block">ملف PDF — حتى 25 ميغابايت<input required disabled={busy} type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block max-w-full my-2" /></label>
          <button disabled={busy} className="rounded-xl bg-blue-600 text-white px-5 py-3 disabled:opacity-50">{busy ? 'جارٍ الحفظ…' : 'حفظ الكتاب في المنصة'}</button>
        </form>
        <h3 className="font-bold my-3">الكتب المحفوظة</h3>
        {entries.length === 0 && <p>لا توجد كتب محفوظة لهذه المادة.</p>}
        <ul className="space-y-3">{entries.map(entry => <li key={entry.id} className="border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"><span>{entry.title}</span><button onClick={() => open(entry)} className="text-blue-700 underline">فتح الكتاب</button></li>)}</ul>
      </>}
    </>}
    <p role="status" className="mt-4 whitespace-pre-wrap">{message}</p>
  </section>;
}
