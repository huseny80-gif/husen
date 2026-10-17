'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Question, QuestionDraft, Quiz } from '@/lib/types';
import {
  generateQuestions, newUid, parseQuestionBank, validateDraft,
} from '@/lib/question-generator';
import { QuestionEditor, blankDraft } from './QuestionEditor';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight, Eye, EyeOff, FileText, Plus, RefreshCw, Save, Sparkles, Trash2, Upload, ClipboardPaste,
} from 'lucide-react';
import { clsx } from 'clsx';

interface ChapterInfo { id: string; title: string; course_id: string }
interface SourceDoc   { id: string; title: string; body: string | null }
interface Notice      { type: 'ok' | 'err' | 'info'; text: string }

const BANK_EXAMPLE = `س: ما هي الوحدة الأساسية للحياة؟
أ) الخلية
ب) النسيج
ج) العضو
د) الجهاز
الإجابة: أ
التفسير: الخلية هي أصغر وحدة تقوم بجميع الوظائف الحيوية.

س: الميتوكوندريا مسؤولة عن إنتاج الطاقة
الإجابة: صح
التفسير: تُسمّى مصنع الطاقة في الخلية.`;

const toDraft = (q: Question): QuestionDraft => ({
  uid: q.id,
  dbId: q.id,
  question_type: q.question_type ?? 'mcq',
  question_text: q.question_text,
  options: q.options,
  correct_answer: q.correct_answer,
  explanation: q.explanation ?? '',
  source_excerpt: q.source_excerpt ?? undefined,
  points: q.points,
});

const toRow = (d: QuestionDraft, sourceId: string | null) => ({
  question_text: d.question_text.trim(),
  options: d.options.map(o => ({ key: o.key, text: o.text.trim() })),
  correct_answer: d.correct_answer,
  explanation: d.explanation.trim() || null,
  points: d.points,
  question_type: d.question_type,
  source_content_id: d.source_excerpt ? sourceId : null,
  source_excerpt: d.source_excerpt ?? null,
});

export function QuizBuilder({ chapterId }: { chapterId: string }) {
  const [chapter, setChapter]   = useState<ChapterInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [quizzes, setQuizzes]   = useState<Quiz[]>([]);
  const [quizId, setQuizId]     = useState('');
  const [sources, setSources]   = useState<SourceDoc[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceText, setSourceText]   = useState('');
  const [count, setCount]       = useState(8);
  const [tfPercent, setTfPercent] = useState(30);
  const [seed, setSeed]         = useState(1);
  const [drafts, setDrafts]     = useState<QuestionDraft[]>([]);
  const [saved, setSaved]       = useState<QuestionDraft[]>([]);
  const [dirty, setDirty]       = useState<Set<string>>(new Set());
  const [bankText, setBankText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [passScore, setPassScore] = useState(50);
  const [timeLimit, setTimeLimit] = useState('');
  const [busy, setBusy]         = useState(false);
  const [notice, setNotice]     = useState<Notice | null>(null);

  const ok   = (text: string) => setNotice({ type: 'ok', text });
  const info = (text: string) => setNotice({ type: 'info', text });
  const fail = (text: string, err?: { message?: string } | null) => {
    const hint = err?.message?.includes('question_type') || err?.message?.includes('source_')
      ? ' — شغّل ملف 002_interactive_quiz.sql في Supabase أولاً.' : err?.message ? ` (${err.message})` : '';
    setNotice({ type: 'err', text: text + hint });
  };

  // ─── التحميل ───────────────────────────────────────────────
  const loadQuestions = useCallback(async (id: string) => {
    if (!id) { setSaved([]); return; }
    const { data } = await supabase.from('questions').select('*').eq('quiz_id', id)
      .order('sort_order', { ascending: true });
    setSaved(((data ?? []) as unknown as Question[]).map(toDraft));
    setDirty(new Set());
  }, []);

  useEffect(() => {
    (async () => {
      const { data: ch } = await supabase.from('chapters')
        .select('id, title, course_id').eq('id', chapterId).single();
      if (ch) setChapter(ch as unknown as ChapterInfo);

      const [qz, src] = await Promise.all([
        supabase.from('quizzes').select('*').eq('chapter_id', chapterId).order('created_at'),
        supabase.from('contents').select('id, title, body').eq('chapter_id', chapterId)
          .eq('content_type', 'summary').order('sort_order'),
      ]);
      const quizList = (qz.data ?? []) as unknown as Quiz[];
      setQuizzes(quizList);
      setSources((src.data ?? []) as unknown as SourceDoc[]);
      if (quizList[0]) setQuizId(quizList[0].id);
      setLoading(false);
    })();
  }, [chapterId]);

  useEffect(() => { loadQuestions(quizId); }, [quizId, loadQuestions]);

  const quiz = quizzes.find(q => q.id === quizId) ?? null;

  // ─── الاختبار ──────────────────────────────────────────────
  async function createQuiz() {
    if (!newTitle.trim()) return fail('اكتب عنوان الاختبار');
    setBusy(true);
    const { data, error } = await supabase.from('quizzes').insert({
      chapter_id: chapterId, title: newTitle.trim(), pass_score: passScore,
      time_limit_min: timeLimit ? Number(timeLimit) : null,
    }).select('*').single();
    setBusy(false);
    if (error || !data) return fail('تعذّر إنشاء الاختبار', error);
    const created = data as unknown as Quiz;
    setQuizzes(q => [...q, created]);
    setQuizId(created.id);
    setNewTitle('');
    ok('تم إنشاء الاختبار — أضف الآن نص المادة وولّد الأسئلة');
  }

  async function toggleActive() {
    if (!quiz) return;
    const { error } = await supabase.from('quizzes').update({ is_active: !quiz.is_active }).eq('id', quiz.id);
    if (error) return fail('تعذّر تغيير حالة الاختبار', error);
    setQuizzes(qs => qs.map(q => (q.id === quiz.id ? { ...q, is_active: !q.is_active } : q)));
    ok(quiz.is_active ? 'تم إخفاء الاختبار عن الطلاب' : 'تم نشر الاختبار للطلاب');
  }

  async function deleteQuiz() {
    if (!quiz || !window.confirm(`حذف الاختبار «${quiz.title}» وجميع أسئلته ونتائجه؟`)) return;
    const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id);
    if (error) return fail('تعذّر حذف الاختبار', error);
    const rest = quizzes.filter(q => q.id !== quiz.id);
    setQuizzes(rest);
    setQuizId(rest[0]?.id ?? '');
    ok('تم حذف الاختبار');
  }

  // ─── نص المادة ─────────────────────────────────────────────
  function pickSource(id: string) {
    const s = sources.find(x => x.id === id);
    setSourceId(s?.id ?? null);
    setSourceTitle(s?.title ?? '');
    setSourceText(s?.body ?? '');
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setSourceText(await file.text());
    if (!sourceTitle) setSourceTitle(file.name.replace(/\.[^.]+$/, ''));
    setSourceId(null);
  }

  async function saveSource() {
    if (!sourceText.trim()) return fail('لا يوجد نص لحفظه');
    setBusy(true);
    const title = sourceTitle.trim() || `ملخص ${chapter?.title ?? ''}`;
    if (sourceId) {
      const { error } = await supabase.from('contents').update({ title, body: sourceText }).eq('id', sourceId);
      setBusy(false);
      if (error) return fail('تعذّر حفظ النص', error);
      setSources(s => s.map(x => (x.id === sourceId ? { ...x, title, body: sourceText } : x)));
    } else {
      const { data, error } = await supabase.from('contents').insert({
        chapter_id: chapterId, content_type: 'summary', title, body: sourceText, sort_order: sources.length,
      }).select('id, title, body').single();
      setBusy(false);
      if (error || !data) return fail('تعذّر حفظ النص', error);
      const doc = data as unknown as SourceDoc;
      setSources(s => [...s, doc]);
      setSourceId(doc.id);
    }
    ok('تم حفظ النص كمحتوى للفصل — سيُربط به كل سؤال يُولَّد منه');
  }

  // ─── التوليد والإدخال ──────────────────────────────────────
  function generate() {
    if (sourceText.trim().length < 80) return fail('النص قصير جداً — الصق ملخص الفصل (بضع جمل على الأقل)');
    if (drafts.length && !window.confirm('سيتم استبدال المسودات الحالية. متابعة؟')) return;
    const out = generateQuestions(sourceText, { count, tfRatio: tfPercent / 100, seed });
    setSeed(s => s + 1);
    setDrafts(out);
    if (out.length === 0) return fail('لم يُستخرج أي سؤال — اكتب النص كجمل كاملة تنتهي بنقطة');
    info(
      `تم توليد ${out.length} سؤالاً كمسودات. راجعها وعدّلها ثم احفظها.` +
      (out.length < count ? ` (النص يتسع لـ ${out.length} فقط — أضف نصاً أطول لمزيد من الأسئلة)` : '')
    );
  }

  function importBank() {
    const { drafts: parsed, errors } = parseQuestionBank(bankText);
    if (parsed.length) setDrafts(d => [...d, ...parsed]);
    if (errors.length) {
      setNotice({
        type: parsed.length ? 'info' : 'err',
        text: `أُضيف ${parsed.length} سؤال. أخطاء: ` + errors.map(e => `(${e.index}) ${e.message}`).join(' | '),
      });
    } else if (parsed.length) {
      setBankText('');
      ok(`أُضيف ${parsed.length} سؤال إلى المسودات`);
    } else {
      fail('لم يتم التعرف على أي سؤال — راجع الصيغة في المثال');
    }
  }

  // ─── الحفظ ─────────────────────────────────────────────────
  async function saveDrafts() {
    if (!quizId) return fail('اختر اختباراً أو أنشئ واحداً أولاً');
    const bad = drafts.findIndex(d => validateDraft(d).length > 0);
    if (bad >= 0) return fail(`السؤال رقم ${bad + 1} غير مكتمل: ${validateDraft(drafts[bad])[0]}`);
    setBusy(true);
    const rows = drafts.map((d, i) => ({ quiz_id: quizId, sort_order: saved.length + i, ...toRow(d, sourceId) }));
    const { error } = await supabase.from('questions').insert(rows);
    setBusy(false);
    if (error) return fail('تعذّر حفظ الأسئلة', error);
    setDrafts([]);
    await loadQuestions(quizId);
    ok(`تم حفظ ${rows.length} سؤال في الاختبار`);
  }

  async function saveEdited(d: QuestionDraft) {
    const problems = validateDraft(d);
    if (problems.length) return fail(problems[0]);
    const { error } = await supabase.from('questions').update(toRow(d, d.source_excerpt ? sourceId : null))
      .eq('id', d.dbId!);
    if (error) return fail('تعذّر حفظ التعديل', error);
    setDirty(s => { const n = new Set(s); n.delete(d.uid); return n; });
    ok('تم حفظ التعديل');
  }

  async function deleteSaved(d: QuestionDraft) {
    if (!window.confirm('حذف هذا السؤال نهائياً؟')) return;
    const { error } = await supabase.from('questions').delete().eq('id', d.dbId!);
    if (error) return fail('تعذّر حذف السؤال', error);
    setSaved(s => s.filter(x => x.uid !== d.uid));
    ok('تم حذف السؤال');
  }

  const addBlank = (type: 'mcq' | 'true_false') => setDrafts(d => [...d, blankDraft(type, newUid())]);

  // ─── العرض ─────────────────────────────────────────────────
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>;
  }
  if (!chapter) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600" dir="rtl">
      الفصل غير موجود أو لا تملك صلاحية الوصول إليه
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <Link href="/instructor/dashboard" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2">
            <ArrowRight className="w-4 h-4" /> العودة للوحة التحكم
          </Link>
          <h1 className="text-2xl font-black text-gray-900">اختبارات الفصل: {chapter.title}</h1>
          <p className="text-sm text-gray-500">أسئلة مستخلصة من نص المادة نفسه — بدون أي خدمة خارجية أو مفاتيح API</p>
        </div>

        {notice && (
          <div className={clsx(
            'rounded-xl px-4 py-3 text-sm border',
            notice.type === 'ok'   && 'bg-green-50 text-green-800 border-green-200',
            notice.type === 'err'  && 'bg-red-50 text-red-800 border-red-200',
            notice.type === 'info' && 'bg-blue-50 text-blue-800 border-blue-200',
          )}>{notice.text}</div>
        )}

        {/* 1. الاختبار */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-3">1) الاختبار</h2>
          {quizzes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select value={quizId} onChange={e => setQuizId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}{q.is_active ? '' : ' (مخفي)'}</option>)}
              </select>
              {quiz && (
                <>
                  <Button size="sm" variant="secondary" onClick={toggleActive}>
                    {quiz.is_active ? <><EyeOff className="w-4 h-4" /> إخفاء عن الطلاب</> : <><Eye className="w-4 h-4" /> نشر للطلاب</>}
                  </Button>
                  <Link href={`/student/quiz/${quiz.id}`} target="_blank"
                    className="text-sm text-blue-600 hover:underline">معاينة كطالب ↗</Link>
                  <button onClick={deleteQuiz} className="text-gray-400 hover:text-red-500 mr-auto" title="حذف الاختبار">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[200px] text-xs text-gray-500">
              اختبار جديد
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="مثال: اختبار الوحدة الأولى"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-xs text-gray-500">نسبة النجاح %
              <input type="number" min={1} max={100} value={passScore} onChange={e => setPassScore(Number(e.target.value))}
                className="mt-1 block w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-xs text-gray-500">المدة (دقيقة)
              <input type="number" min={1} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="بلا حد"
                className="mt-1 block w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
            </label>
            <Button onClick={createQuiz} loading={busy} size="sm"><Plus className="w-4 h-4" /> إنشاء</Button>
          </div>
        </Card>

        {/* 2. نص المادة */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> 2) نص المادة الدراسية
          </h2>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {sources.length > 0 && (
              <select value={sourceId ?? ''} onChange={e => pickSource(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">— نص جديد —</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            )}
            <input value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} placeholder="عنوان الملخص"
              className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2">
              <Upload className="w-4 h-4" /> رفع ملف نصي (.txt)
              <input type="file" accept=".txt,.md,text/plain" className="sr-only"
                onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} rows={8}
            placeholder="الصق هنا ملخص الفصل أو نص المادة (جمل كاملة تنتهي بنقطة)…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm leading-relaxed focus:ring-2 focus:ring-blue-400 focus:outline-none" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{sourceText.trim().split(/\s+/).filter(Boolean).length} كلمة</span>
            <Button size="sm" variant="secondary" onClick={saveSource} loading={busy}>
              <Save className="w-4 h-4" /> حفظ النص كمحتوى للفصل
            </Button>
          </div>
        </Card>

        {/* 3. التوليد */}
        <Card>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" /> 3) توليد الأسئلة من النص
          </h2>
          <div className="flex flex-wrap items-end gap-4 mb-3">
            <label className="text-xs text-gray-500">عدد الأسئلة
              <input type="number" min={1} max={30} value={count} onChange={e => setCount(Number(e.target.value) || 1)}
                className="mt-1 block w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-xs text-gray-500 flex-1 min-w-[200px]">
              نسبة أسئلة صح/خطأ: {tfPercent}%
              <input type="range" min={0} max={100} step={10} value={tfPercent}
                onChange={e => setTfPercent(Number(e.target.value))} className="mt-2 block w-full accent-purple-600" />
            </label>
            <Button onClick={generate} className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
              {drafts.length ? <><RefreshCw className="w-4 h-4" /> إعادة التوليد</> : <><Sparkles className="w-4 h-4" /> توليد</>}
            </Button>
          </div>

          <details className="border-t border-gray-100 pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4" /> أو الصق بنك أسئلة جاهزاً
            </summary>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mt-2 whitespace-pre-wrap" dir="rtl">{BANK_EXAMPLE}</pre>
            <textarea value={bankText} onChange={e => setBankText(e.target.value)} rows={6}
              placeholder="الصق الأسئلة بالصيغة أعلاه…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2" />
            <Button size="sm" variant="secondary" className="mt-2" onClick={importBank} disabled={!bankText.trim()}>
              إضافة إلى المسودات
            </Button>
          </details>
        </Card>

        {/* 4. المسودات */}
        {drafts.length > 0 && (
          <Card className="border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">4) مسودات بانتظار المراجعة ({drafts.length})</h2>
              <Button variant="success" onClick={saveDrafts} loading={busy} disabled={!quizId}>
                <Save className="w-4 h-4" /> حفظ الكل في الاختبار
              </Button>
            </div>
            {!quizId && <p className="text-xs text-amber-700 mb-2">أنشئ اختباراً أو اخترْه في الخطوة 1 قبل الحفظ.</p>}
            <div className="space-y-3">
              {drafts.map((d, i) => (
                <div key={d.uid}>
                  <QuestionEditor draft={d} index={i + 1}
                    onChange={nd => setDrafts(ds => ds.map(x => (x.uid === d.uid ? nd : x)))}
                    onDelete={() => setDrafts(ds => ds.filter(x => x.uid !== d.uid))} />
                  {d.source_excerpt && (
                    <p className="text-xs text-gray-400 mt-1 pr-2">المصدر: «{d.source_excerpt}»</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={() => addBlank('mcq')}><Plus className="w-4 h-4" /> سؤال اختيار من متعدد</Button>
              <Button size="sm" variant="secondary" onClick={() => addBlank('true_false')}><Plus className="w-4 h-4" /> سؤال صح/خطأ</Button>
            </div>
          </Card>
        )}
        {drafts.length === 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => addBlank('mcq')}><Plus className="w-4 h-4" /> إضافة سؤال يدوي</Button>
            <Button size="sm" variant="secondary" onClick={() => addBlank('true_false')}><Plus className="w-4 h-4" /> سؤال صح/خطأ</Button>
          </div>
        )}

        {/* 5. الأسئلة المحفوظة */}
        {quiz && (
          <Card>
            <h2 className="font-bold text-gray-900 mb-3">أسئلة «{quiz.title}» ({saved.length})</h2>
            {saved.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد أسئلة محفوظة بعد</p>
            ) : (
              <div className="space-y-3">
                {saved.map((d, i) => (
                  <div key={d.uid}>
                    <QuestionEditor draft={d} index={i + 1}
                      onChange={nd => {
                        setSaved(s => s.map(x => (x.uid === d.uid ? nd : x)));
                        setDirty(s => new Set(s).add(d.uid));
                      }}
                      onDelete={() => deleteSaved(d)} />
                    {dirty.has(d.uid) && (
                      <div className="mt-1 text-left">
                        <Button size="sm" onClick={() => saveEdited(d)}><Save className="w-4 h-4" /> حفظ التعديل</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
