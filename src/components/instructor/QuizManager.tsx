'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Chapter, Quiz, Question } from '@/lib/types';
import { validateQuiz, validateQuestion } from '@/lib/quiz-validation';
import { Button } from '@/components/ui/Button';
import { SourceQuizBuilder } from './SourceQuizBuilder';
import { ScientificText } from '@/components/content/ScientificText';
import { Card } from '@/components/ui/Card';

const field = 'w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 bg-white';
const keys = ['A', 'B', 'C', 'D'];
const blankQuiz = { title: '', description: '', minutes: '', passScore: '50' };
const blankQuestion = () => ({ text: '', options: keys.map(key => ({ key, text: '' })), answer: 'A', explanation: '', points: '1' });

export function QuizManager({ chapter, courseTitle, onBack }: { chapter: Chapter; courseTitle: string; onBack: () => void }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quizForm, setQuizForm] = useState(blankQuiz);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [questionForm, setQuestionForm] = useState(blankQuestion);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => { loadQuizzes(); }, [chapter.id]);
  async function loadQuizzes() {
    setLoading(true);
    const { data, error } = await supabase.from('quizzes').select('*').eq('chapter_id', chapter.id).order('created_at');
    if (error) setError(error.message); else setQuizzes((data ?? []) as unknown as Quiz[]);
    setLoading(false);
  }
  async function openQuiz(quiz: Quiz) {
    setSelected(quiz); setQuestions([]); setLoading(true); setError(''); setNotice(''); setShowQuestionForm(false);
    const { data, error } = await supabase.from('questions').select('*').eq('quiz_id', quiz.id).order('sort_order');
    if (error) setError(error.message); else setQuestions((data ?? []) as unknown as Question[]);
    setLoading(false);
  }
  async function saveQuiz(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice('');
    const minutes = quizForm.minutes === '' ? null : Number(quizForm.minutes);
    const invalid = validateQuiz(quizForm.title, Number(quizForm.passScore), minutes);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      const values = { title: quizForm.title.trim(), description: quizForm.description.trim() || null, time_limit_min: minutes, pass_score: Number(quizForm.passScore) };
      const result = editingQuiz
        ? await supabase.from('quizzes').update(values).eq('id', editingQuiz).select('*').single()
        : await supabase.from('quizzes').insert({ ...values, chapter_id: chapter.id, is_active: false }).select('*').single();
      if (result.error) throw result.error;
      setShowQuizForm(false); setEditingQuiz(null); setQuizForm(blankQuiz);
      setNotice('تم حفظ الاختبار. أضف الأسئلة ثم انشره عندما يصبح جاهزًا.');
      await loadQuizzes();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function toggleQuiz(quiz: Quiz) {
    setError(''); setNotice(''); setBusy(true);
    try {
      if (!quiz.is_active) {
        const { data, error } = await supabase.from('questions').select('*').eq('quiz_id', quiz.id);
        if (error) throw error;
        const items = (data ?? []) as unknown as Question[];
        if (!items.length || items.some(q => validateQuestion(q.question_text, q.options, q.correct_answer, q.points))) throw new Error('أضف سؤالًا صحيحًا واحدًا على الأقل وأصلح الأسئلة غير المكتملة قبل النشر.');
      }
      const { data, error } = await supabase.from('quizzes').update({ is_active: !quiz.is_active }).eq('id', quiz.id).select('*').single();
      if (error) throw error;
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? data as unknown as Quiz : q));
      setNotice(quiz.is_active ? 'تم إيقاف الاختبار.' : 'تم نشر الاختبار.');
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function saveQuestion(e: FormEvent) {
    e.preventDefault(); if (!selected || selected.is_active) return;
    setError(''); setNotice('');
    const invalid = validateQuestion(questionForm.text, questionForm.options, questionForm.answer, Number(questionForm.points));
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      const values = { question_text: questionForm.text.trim(), options: questionForm.options.map(o => ({...o, text: o.text.trim()})), correct_answer: questionForm.answer, explanation: questionForm.explanation.trim() || null, points: Number(questionForm.points) };
      const result = editingQuestion
        ? await supabase.from('questions').update(values).eq('id', editingQuestion).eq('quiz_id', selected.id).select('*').single()
        : await supabase.from('questions').insert({ ...values, quiz_id: selected.id, sort_order: Math.max(0, ...questions.map(q => q.sort_order)) + 1 }).select('*').single();
      if (result.error) throw result.error;
      await openQuiz(selected); setEditingQuestion(null); setQuestionForm(blankQuestion()); setNotice('تم حفظ السؤال.');
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function deleteQuestion(q: Question) {
    if (!selected || selected.is_active || !confirm('حذف هذا السؤال نهائيًا؟')) return;
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.from('questions').delete().eq('id', q.id).eq('quiz_id', selected.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('لم يتم الحذف. تحقق من صلاحيات الحساب.');
      setQuestions(prev => prev.filter(item => item.id !== q.id)); setNotice('تم حذف السؤال.');
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
    <div className="max-w-4xl mx-auto space-y-4">
      <Button variant="secondary" disabled={busy} onClick={() => { if (selected) { setSelected(null); setError(''); setNotice(''); loadQuizzes(); } else onBack(); }}>رجوع إلى {selected ? 'الاختبارات' : 'الفصول'}</Button>
      <p className="text-sm text-gray-500">{courseTitle} / {chapter.title}</p>
      <h1 className="text-2xl font-bold text-gray-900">{selected ? selected.title : 'اختبارات الفصل'}</h1>
      {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">تعذرت العملية: {error}</p>}
      {notice && <p role="status" className="bg-green-50 text-green-800 rounded-xl p-4">{notice}</p>}
      {!selected ? <>
        <SourceQuizBuilder chapterId={chapter.id} onSaved={loadQuizzes} />
        <Button disabled={busy} onClick={() => { setQuizForm(blankQuiz); setEditingQuiz(null); setShowQuizForm(true); }}>إضافة اختبار جديد</Button>
        {showQuizForm && <Card><form onSubmit={saveQuiz} className="space-y-3">
          <label className="block">عنوان الاختبار<input required className={field} value={quizForm.title} onChange={e => setQuizForm({...quizForm, title:e.target.value})} /></label>
          <label className="block">الوصف<textarea className={field} value={quizForm.description} onChange={e => setQuizForm({...quizForm, description:e.target.value})} /></label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label>المدة بالدقائق (فارغ = بلا حد)<input type="number" min="1" step="1" className={field} value={quizForm.minutes} onChange={e => setQuizForm({...quizForm, minutes:e.target.value})} /></label>
            <label>نسبة النجاح %<input required type="number" min="0" max="100" step="1" className={field} value={quizForm.passScore} onChange={e => setQuizForm({...quizForm, passScore:e.target.value})} /></label>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit" loading={busy}>حفظ الاختبار</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setShowQuizForm(false)}>إلغاء</Button></div>
        </form></Card>}
        {loading ? <p role="status">جارٍ تحميل الاختبارات…</p> : !quizzes.length ? <Card>لا توجد اختبارات بعد.</Card> : quizzes.map(q => <Card key={q.id}>
          <h2 className="font-bold text-lg break-words">{q.title}</h2><p className="text-gray-500">{q.is_active ? 'منشور' : 'مسودة / موقوف'} · النجاح {q.pass_score}% · {q.time_limit_min ? `${q.time_limit_min} دقيقة` : 'بلا حد زمني'}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" disabled={busy} onClick={() => openQuiz(q)}>إدارة الأسئلة</Button>
            <Button size="sm" variant="secondary" disabled={busy || q.is_active} onClick={() => { setEditingQuiz(q.id); setQuizForm({title:q.title, description:q.description ?? '', minutes:q.time_limit_min?.toString() ?? '', passScore:String(q.pass_score)}); setShowQuizForm(true); }}>تعديل الإعدادات</Button>
            <Button size="sm" variant={q.is_active ? 'secondary' : 'success'} disabled={busy} onClick={() => toggleQuiz(q)}>{q.is_active ? 'إيقاف الاختبار' : 'نشر الاختبار'}</Button>
            {q.is_active && <a className="text-blue-700 underline self-center" href={`/student/quiz/${q.id}`} target="_blank" rel="noreferrer">فتح الاختبار</a>}
          </div>
        </Card>)}
      </> : <>
        <p>{questions.length} سؤال · مجموع الدرجات {questions.reduce((sum,q) => sum + q.points, 0)}</p>
        {selected.is_active ? <p className="bg-amber-50 p-3 rounded-xl">أوقف نشر الاختبار من قائمة الاختبارات قبل تعديل الأسئلة.</p> : <Button disabled={busy || loading} onClick={() => { setEditingQuestion(null); setQuestionForm(blankQuestion()); setShowQuestionForm(true); }}>إضافة سؤال</Button>}
        {showQuestionForm && !selected.is_active && <Card><form onSubmit={saveQuestion} className="space-y-3">
          <label className="block">نص السؤال<textarea required className={field} value={questionForm.text} onChange={e => setQuestionForm({...questionForm,text:e.target.value})} /></label>
          <fieldset className="space-y-2"><legend>الخيارات — حدد الإجابة الصحيحة</legend>{questionForm.options.map((o,i) => <div key={o.key} className="flex items-center gap-2">
            <input aria-label={`الإجابة الصحيحة ${o.key}`} type="radio" name="correct-answer" checked={questionForm.answer === o.key} onChange={() => setQuestionForm({...questionForm, answer:o.key})} /><label htmlFor={`option-${o.key}`}>{o.key}</label>
            <input id={`option-${o.key}`} required className={field} value={o.text} onChange={e => setQuestionForm({...questionForm,options:questionForm.options.map((item,j) => j === i ? {...item,text:e.target.value} : item)})} />
          </div>)}</fieldset>
          <label className="block">تفسير الإجابة<textarea className={field} value={questionForm.explanation} onChange={e => setQuestionForm({...questionForm,explanation:e.target.value})} /></label>
          <label className="block">الدرجة<input required type="number" min="1" step="1" className={field} value={questionForm.points} onChange={e => setQuestionForm({...questionForm,points:e.target.value})} /></label>
          <div className="flex gap-2"><Button type="submit" loading={busy}>حفظ السؤال</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setShowQuestionForm(false)}>إلغاء</Button></div>
        </form></Card>}
        {loading ? <p role="status">جارٍ تحميل الأسئلة…</p> : !questions.length ? <Card>لم تُضف أسئلة لهذا الاختبار بعد.</Card> : questions.map((q,i) => <Card key={q.id}>
          <h2 className="font-bold whitespace-pre-wrap">{i+1}. <ScientificText text={q.question_text}/></h2>
          <ul className="space-y-1 mt-2">{q.options.map(o => <li key={o.key} className={o.key === q.correct_answer ? 'text-green-700 font-semibold' : ''}>{o.key}: <ScientificText text={o.text}/>{o.key === q.correct_answer ? ' ✓ الإجابة الصحيحة' : ''}</li>)}</ul>
          {q.explanation && <p className="mt-2 whitespace-pre-wrap">التفسير: <ScientificText text={q.explanation}/></p>}<p className="text-sm text-gray-500">الدرجة: {q.points}</p>
          {!selected.is_active && <div className="flex gap-2 mt-3"><Button size="sm" variant="secondary" disabled={busy} onClick={() => {setEditingQuestion(q.id);setQuestionForm({text:q.question_text,options:q.options.map(o => ({...o})),answer:q.correct_answer,explanation:q.explanation ?? '',points:String(q.points)});setShowQuestionForm(true);}}>تعديل</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => deleteQuestion(q)}>حذف</Button></div>}
        </Card>)}
      </>}
    </div>
  </div>;
}
