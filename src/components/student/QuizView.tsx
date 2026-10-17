'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ScientificText } from '@/components/content/ScientificText';
import { supabase } from '@/lib/supabase';
import { Quiz, Question, QuizOption, QuizResult, QuestionReview } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import {
  ChevronRight, ChevronLeft, Clock, Send,
  CheckCircle, XCircle, Lightbulb, Trophy, RotateCcw
} from 'lucide-react';

interface Props {
  quizId: string;
  studentId: string;
}

type Phase = 'loading' | 'taking' | 'result' | 'error';

export function QuizView({ quizId, studentId }: Props) {
  const [quiz, setQuiz]             = useState<Quiz | null>(null);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [phase, setPhase]           = useState<Phase>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft]     = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const submitLock = useRef(false);
  const [attemptId, setAttemptId]   = useState<string | null>(null);

  // Fetch quiz + create attempt
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
      const { data: quizData, error: qErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (qErr || !quizData) throw new Error(qErr?.message ?? 'الاختبار غير متاح.');

      const { data: qsData, error: qsErr } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true });

      if (qsErr || !qsData?.length) throw new Error(qsErr?.message ?? 'لا توجد أسئلة لهذا الاختبار.');
      if (cancelled) return;

      setQuiz(quizData as unknown as Quiz);
      setQuestions(qsData as unknown as Question[]);
      if ((quizData as any).time_limit_min) {
        setTimeLeft((quizData as any).time_limit_min * 60);
      }

      // Create attempt record
      const { data: attempt, error: attemptError } = await supabase
        .from('student_quiz_attempts')
        .insert({ student_id: studentId, quiz_id: quizId, answers: {}, total_points: qsData.reduce((s, q: any) => s + q.points, 0) })
        .select('id')
        .single();
      if (attemptError || !attempt) throw new Error('تعذر بدء المحاولة: ' + (attemptError?.message ?? 'لم يتم إنشاء سجل المحاولة.'));
      if (cancelled) return;
      setAttemptId((attempt as any).id);

      setPhase('taking');
      } catch (error) {
        if (!cancelled) { setErrorMessage((error as Error).message); setPhase('error'); }
      }
    }
    init();
    return () => { cancelled = true; };
  }, [quizId, studentId]);

  const selectAnswer = (questionId: string, key: string) => {
    if (submitting || timeLeft === 0) return;
    setAnswers(prev => ({ ...prev, [questionId]: key }));
  };

  const submitQuiz = useCallback(async () => {
    if (submitLock.current || !quiz || phase !== 'taking') return;
    if (!attemptId) { setErrorMessage('لا يوجد سجل للمحاولة. أعد فتح الاختبار.'); return; }
    submitLock.current = true;
    setSubmitting(true);
    setErrorMessage('');
    try {

    // Calculate score
    let score = 0;
    const reviews: QuestionReview[] = questions.map(q => {
      const selected = answers[q.id] ?? null;
      const correct  = selected === q.correct_answer;
      if (correct) score += q.points;
      return { question: q, selected_answer: selected, is_correct: correct };
    });
    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    const percentage  = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed      = percentage >= quiz.pass_score;

    // Save to DB
    {
      const { data: saved, error: saveError } = await supabase.from('student_quiz_attempts').update({
        answers,
        score,
        percentage,
        passed,
        submitted_at: new Date().toISOString(),
      }).eq('id', attemptId).eq('student_id', studentId).is('submitted_at', null).select('id').single();
      if (saveError || !saved) throw new Error(saveError?.message ?? 'لم يتم تحديث سجل المحاولة.');
    }

    setResult({ attempt_id: attemptId ?? '', score, total_points: totalPoints, percentage, passed,
      correct_count: reviews.filter(r => r.is_correct).length,
      wrong_count:   reviews.filter(r => !r.is_correct).length,
      questions_review: reviews,
    });
    setPhase('result');
    } catch (error) {
      setErrorMessage('لم يتم تأكيد حفظ النتيجة: ' + (error as Error).message + ' — إجاباتك باقية في هذه الصفحة. أعد محاولة الإرسال أو افحص سجل التقدم قبل إغلاق الصفحة.');
    } finally { submitLock.current = false; setSubmitting(false); }
  }, [answers, questions, quiz, attemptId, studentId, phase]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'taking' || timeLeft === null || submitting || errorMessage) return;
    if (timeLeft <= 0) { submitQuiz(); return; }
    const t = setTimeout(() => setTimeLeft(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, submitting, errorMessage, submitQuiz]);

  // ─── Render ──────────────────────────────────────────────
  if (phase === 'loading') return <QuizSkeleton />;
  if (phase === 'error')   return <ErrorState message={errorMessage} />;
  if (phase === 'result' && result) return <ResultView result={result} quiz={quiz!} onRetry={() => window.location.reload()} />;

  const q         = questions[current];
  const answered  = Object.keys(answers).length;
  const progress  = Math.round((answered / questions.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col p-4" dir="rtl">
      {errorMessage && <div role="alert" className="max-w-2xl mx-auto w-full mb-4 rounded-xl bg-red-50 text-red-700 p-4"><p>{errorMessage}</p><Button variant="secondary" className="mt-2" onClick={submitQuiz} loading={submitting}>إعادة محاولة حفظ النتيجة</Button><a href="/student/progress" target="_blank" rel="noreferrer" className="block mt-2 underline">فتح سجل التقدم في نافذة أخرى</a></div>}
      {/* Top Bar */}
      <div className="max-w-2xl mx-auto w-full mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900 text-lg">{quiz?.title}</h2>
          {timeLeft !== null && <TimerBadge seconds={timeLeft} />}
        </div>
        {/* Progress */}
        <div className="bg-white rounded-full h-2 overflow-hidden shadow-sm">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">
          {answered} / {questions.length} سؤال تم الإجابة عليه
        </p>
      </div>

      {/* Question Card */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        <Card className="shadow-lg">
          {/* Question number */}
          <div className="flex items-center justify-between mb-4">
            <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
              سؤال {current + 1} / {questions.length}
            </span>
            <span className="text-xs text-gray-400">{q.points} نقطة</span>
          </div>

          {/* Question text */}
          <p className="text-gray-900 font-semibold text-lg leading-relaxed mb-6">
            <ScientificText text={q.question_text}/>
          </p>

          {/* Options */}
          <div className="space-y-3">
            {(q.options as QuizOption[]).map(opt => {
              const selected = answers[q.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => selectAnswer(q.id, opt.key)}
                  className={clsx(
                    'w-full text-right p-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-3',
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                  )}
                >
                  <span className={clsx(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0',
                    selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-500'
                  )}>
                    {opt.key}
                  </span>
                  <span className="flex-1"><ScientificText text={opt.text}/></span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <Button
              variant="secondary" size="sm"
              onClick={() => setCurrent(c => c - 1)}
              disabled={current === 0}
            >
              <ChevronRight className="w-4 h-4" /> السابق
            </Button>

            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={clsx(
                    'w-7 h-7 rounded-full text-xs font-bold transition-colors',
                    i === current      ? 'bg-blue-600 text-white' :
                    answers[questions[i].id] ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <Button variant="secondary" size="sm" onClick={() => setCurrent(c => c + 1)}>
                التالي <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary" size="sm"
                onClick={submitQuiz}
                loading={submitting}
                className="gap-2"
              >
                <Send className="w-4 h-4" /> إنهاء الاختبار
              </Button>
            )}
          </div>
        </Card>

        {/* Submit from anywhere */}
        {answered > 0 && current < questions.length - 1 && (
          <div className="text-center mt-4">
            <Button variant="success" onClick={submitQuiz} loading={submitting} size="sm">
              <Send className="w-4 h-4" /> إرسال الاختبار الآن ({answered}/{questions.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result View ─────────────────────────────────────────────
function ResultView({ result, quiz, onRetry }: { result: QuizResult; quiz: Quiz; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Score Card */}
        <Card className={clsx('text-center mb-6 border-4', result.passed ? 'border-green-400' : 'border-red-400')}>
          <div className={clsx(
            'w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-4',
            result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {result.percentage}%
          </div>
          <h2 className={clsx('text-2xl font-black mb-1', result.passed ? 'text-green-700' : 'text-red-700')}>
            {result.passed ? '🎉 أحسنت! اجتزت الاختبار' : '😔 لم تجتز الاختبار'}
          </h2>
          <p className="text-gray-600 mb-4">
            حصلت على <strong>{result.score}</strong> من <strong>{result.total_points}</strong> نقطة
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600">{result.correct_count}</div>
              <div className="text-gray-500">إجابات صحيحة</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{result.wrong_count}</div>
              <div className="text-gray-500">إجابات خاطئة</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-600">{quiz.pass_score}%</div>
              <div className="text-gray-500">نسبة النجاح</div>
            </div>
          </div>
        </Card>

        {/* Detailed Review */}
        <h3 className="text-lg font-bold text-gray-900 mb-4">مراجعة تفصيلية للأسئلة</h3>
        <div className="space-y-4">
          {result.questions_review.map((review, idx) => (
            <QuestionReviewCard key={review.question.id} review={review} index={idx + 1} />
          ))}
        </div>

        <div className="text-center mt-6">
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw className="w-4 h-4" /> إعادة الاختبار
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionReviewCard({ review, index }: { review: QuestionReview; index: number }) {
  const { question: q, selected_answer, is_correct } = review;
  const options = q.options as QuizOption[];

  return (
    <Card className={clsx('border-2', is_correct ? 'border-green-200' : 'border-red-200')}>
      {/* Status + Question */}
      <div className="flex items-start gap-3 mb-3">
        {is_correct
          ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          : <XCircle    className="w-5 h-5 text-red-500   shrink-0 mt-0.5" />}
        <div>
          <span className="text-xs text-gray-400 font-medium">سؤال {index}</span>
          <p className="font-semibold text-gray-900"><ScientificText text={q.question_text}/></p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-3">
        {options.map(opt => {
          const isCorrectOpt  = opt.key === q.correct_answer;
          const isSelectedOpt = opt.key === selected_answer;
          return (
            <div
              key={opt.key}
              className={clsx(
                'flex items-center gap-2 p-2.5 rounded-lg text-sm',
                isCorrectOpt   ? 'bg-green-100 text-green-800 font-semibold' :
                isSelectedOpt  ? 'bg-red-100 text-red-800' :
                'bg-gray-50 text-gray-600'
              )}
            >
              <span className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                isCorrectOpt  ? 'bg-green-500 text-white' :
                isSelectedOpt ? 'bg-red-500 text-white' : 'bg-gray-200'
              )}>
                {opt.key}
              </span>
              <ScientificText text={opt.text}/>
              {isCorrectOpt  && <span className="mr-auto text-green-600 text-xs">✓ صحيح</span>}
              {isSelectedOpt && !isCorrectOpt && <span className="mr-auto text-red-600 text-xs">اخترت هذا</span>}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {q.explanation && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-700">💡 التفسير العلمي: </span>
            <span className="text-amber-800"><ScientificText text={q.explanation}/></span>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Timer Badge ─────────────────────────────────────────────
function TimerBadge({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const urgent = seconds < 60;
  return (
    <span className={clsx(
      'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-bold',
      urgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'
    )}>
      <Clock className="w-3.5 h-3.5" />
      {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
    </span>
  );
}

function QuizSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4 animate-pulse" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="h-8 bg-gray-200 rounded-xl w-1/2 mx-auto mb-4" />
        <div className="h-64 bg-white rounded-2xl" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Card className="text-center py-10">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">{message || 'حدث خطأ أثناء تحميل الاختبار'}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>إعادة المحاولة</Button>
      </Card>
    </div>
  );
}
