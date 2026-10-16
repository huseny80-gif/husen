'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StudentQuizAttempt } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';
import { Trophy, TrendingUp, Target, BookOpen, Calendar } from 'lucide-react';

interface Props { studentId: string; }

export function ProgressDashboard({ studentId }: Props) {
  const [attempts, setAttempts] = useState<StudentQuizAttempt[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('student_quiz_attempts')
        .select(`
          *,
          quizzes (
            id, title, pass_score,
            chapters ( id, title,
              courses ( id, title,
                grades ( id, name )
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });
      setAttempts((data ?? []) as unknown as StudentQuizAttempt[]);
      setLoading(false);
    }
    fetch();
  }, [studentId]);

  // ─── Stats ──────────────────────────────────────────────
  const totalAttempts = attempts.length;
  const passedCount   = attempts.filter(a => a.passed).length;
  const avgScore      = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts > 0
    ? Math.max(...attempts.map(a => a.percentage))
    : 0;

  if (loading) return <Skeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-purple-600 p-2.5 rounded-xl">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل التقدم</h1>
          <p className="text-gray-500 text-sm">تاريخ اختباراتك ودرجاتك</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard icon={<BookOpen className="w-5 h-5" />} label="إجمالي الاختبارات" value={totalAttempts} color="blue" />
        <StatsCard icon={<Trophy   className="w-5 h-5" />} label="اختبارات ناجحة"    value={passedCount}  color="green" />
        <StatsCard icon={<TrendingUp className="w-5 h-5" />} label="متوسط الدرجات"   value={`${avgScore}%`} color="purple" />
        <StatsCard icon={<Target  className="w-5 h-5" />}  label="أعلى درجة"        value={`${bestScore}%`} color="yellow" />
      </div>

      {/* Chart: simple bar chart via divs */}
      {attempts.length > 1 && <ProgressChart attempts={attempts.slice(0, 10).reverse()} />}

      {/* Attempts Table */}
      <Card>
        <h3 className="font-bold text-gray-900 mb-4">سجل الاختبارات</h3>
        {attempts.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لم تجرِ أي اختبار بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">الاختبار</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">المادة</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">الدرجة</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">النسبة</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">الحالة</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => {
                  const quiz    = (attempt as any).quizzes;
                  const chapter = quiz?.chapters;
                  const course  = chapter?.courses;
                  const grade   = course?.grades;
                  return (
                    <tr key={attempt.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900">{quiz?.title ?? '—'}</td>
                      <td className="py-3 px-3 text-gray-600">
                        {course?.title && (
                          <div>
                            <span>{course.title}</span>
                            {grade && <span className="text-xs text-gray-400 block">{grade.name}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold">{attempt.score}</span>
                        <span className="text-gray-400">/{attempt.total_points}</span>
                      </td>
                      <td className="py-3 px-3">
                        <PercentBar value={Number(attempt.percentage)} />
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          label={attempt.passed ? 'ناجح' : 'راسب'}
                          color={attempt.passed ? 'green' : 'red'}
                        />
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {attempt.submitted_at
                            ? new Date(attempt.submitted_at).toLocaleDateString('ar-IQ', {
                                day:'numeric', month:'short', year:'numeric'
                              })
                            : '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Stats Card ──────────────────────────────────────────────
function StatsCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-600', green: 'bg-green-600',
    purple: 'bg-purple-600', yellow: 'bg-yellow-500',
  };
  return (
    <Card className="!p-4">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3', colors[color] ?? 'bg-gray-500')}>
        {icon}
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </Card>
  );
}

// ─── Progress bar for percentage ─────────────────────────────
function PercentBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden w-20">
        <div
          className={clsx('h-2 rounded-full', value >= 50 ? 'bg-green-500' : 'bg-red-400')}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={clsx('text-xs font-semibold', value >= 50 ? 'text-green-700' : 'text-red-600')}>
        {value}%
      </span>
    </div>
  );
}

// ─── Mini Bar Chart ──────────────────────────────────────────
function ProgressChart({ attempts }: { attempts: StudentQuizAttempt[] }) {
  return (
    <Card className="mb-6">
      <h3 className="font-bold text-gray-900 mb-4">أداؤك في آخر {attempts.length} اختبارات</h3>
      <div className="flex items-end gap-3 h-32">
        {attempts.map((a, i) => (
          <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">{a.percentage}%</span>
            <div className="w-full relative">
              <div
                className={clsx(
                  'rounded-t-md transition-all',
                  a.passed ? 'bg-green-400' : 'bg-red-400'
                )}
                style={{ height: `${Math.max(8, a.percentage)}px`, maxHeight: '80px' }}
              />
            </div>
            <span className="text-xs text-gray-400">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block"/>ناجح</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block"/>راسب</span>
      </div>
    </Card>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 animate-pulse" dir="rtl">
      <div className="h-10 bg-gray-200 rounded-xl w-48 mb-8" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl" />)}
      </div>
      <div className="h-64 bg-white rounded-2xl" />
    </div>
  );
}
