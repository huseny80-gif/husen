'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';

interface Entry { key: string; kind: 'library' | 'source'; id: string; title: string }
const field = 'block w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900';

// يستخرج نص صفحات من ملف PDF في مكتبة المادة (أو ملفات الفصل) ويعرضه للمراجعة، ثم يحفظه مصدراً نصياً
// تُولَّد منه الأسئلة محلياً. مراجعة النص ضرورية: الخطوط العربية في بعض ملفات PDF قد تُستخرج بأخطاء.
export function PdfTextExtractor({ chapterId, onSaved }: { chapterId: string; onSaved: (sourceId: string) => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState('');
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: chapter } = await supabase.from('chapters').select('course_id').eq('id', chapterId).single();
      const courseId = chapter ? String(chapter.course_id) : '';
      const [lib, src] = await Promise.all([
        courseId
          ? supabase.from('course_library').select('id,title').eq('course_id', courseId).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from('learning_sources').select('id,title').eq('chapter_id', chapterId).not('storage_path', 'is', null),
      ]);
      type Row = { id: string; title: string };
      setEntries([
        ...((lib.data ?? []) as unknown as Row[]).map(r => ({ key: `library:${r.id}`, kind: 'library' as const, id: r.id, title: `مكتبة المادة — ${r.title}` })),
        ...((src.data ?? []) as unknown as Row[]).map(r => ({ key: `source:${r.id}`, kind: 'source' as const, id: r.id, title: `ملف الفصل — ${r.title}` })),
      ]);
    })();
  }, [chapterId]);

  const entry = entries.find(e => e.key === selected);

  async function extract() {
    if (!entry) return;
    setBusy(true); setError(''); setWarnings([]); setText('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/questions/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ kind: entry.kind, id: entry.id, start, end }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'تعذر استخراج النص.');
      setText(body.text); setWarnings(body.warnings ?? []); setTotal(body.total_pages);
      setTitle(`${body.title} — صفحات ${start}–${end}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setError('');
    const { data, error: saveError } = await supabase.from('learning_sources')
      .insert({ chapter_id: chapterId, title: title.trim(), body: text.trim() }).select('id').single();
    setBusy(false);
    if (saveError || !data) { setError(saveError?.message ?? 'تعذر حفظ المصدر.'); return; }
    setText(''); setWarnings([]);
    onSaved(String(data.id));
  }

  return (
    <details className="rounded-xl border border-purple-200 bg-purple-50/40 p-3" open={entries.length > 0}>
      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> استخراج نص من ملف PDF (مكتبة المادة)</summary>
      <div className="mt-3 space-y-3">
        {entries.length === 0
          ? <p className="text-sm text-gray-600">لا توجد ملفات PDF في مكتبة هذه المادة أو في الفصل بعد.</p>
          : <>
            <label className="block">الملف
              <select className={field} value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setText(''); setTotal(null); }}>
                <option value="">اختر ملف PDF</option>
                {entries.map(e => <option key={e.key} value={e.key}>{e.title}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>من صفحة<input type="number" min={1} className={field} value={start} disabled={busy} onChange={e => setStart(Number(e.target.value))} /></label>
              <label>إلى صفحة (حتى 10 صفحات)<input type="number" min={start} max={start + 9} className={field} value={end} disabled={busy} onChange={e => setEnd(Number(e.target.value))} /></label>
            </div>
            <Button disabled={!entry || busy || end < start || end - start > 9} loading={busy} onClick={extract}>استخراج نص الصفحات</Button>
          </>}
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
        {warnings.map((w, i) => <p key={i} role="status" className="rounded bg-amber-50 p-2 text-sm text-amber-800">⚠ {w}</p>)}
        {text && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">راجع النص وصحّح أي خطأ في الحروف قبل الحفظ{total ? ` (الملف ${total} صفحة)` : ''}. علامات «[صفحة N]» تُستعمل لتسجيل مرجع كل سؤال، فلا تحذفها.</p>
            <textarea dir="rtl" rows={12} maxLength={40000} className={field} value={text} onChange={e => setText(e.target.value)} />
            <label className="block">عنوان المصدر<input className={field} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <Button variant="success" loading={busy} disabled={!title.trim() || !text.trim()} onClick={save}>حفظ كمصدر نصي للفصل</Button>
          </div>
        )}
      </div>
    </details>
  );
}
