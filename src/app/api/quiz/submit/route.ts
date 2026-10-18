import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { quiz_id, answers, attempt_id } = body as {
    quiz_id: string;
    answers: Record<string, string>;
    attempt_id: string;
  };

  // Fetch questions server-side to prevent tampering
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, correct_answer, points')
    .eq('quiz_id', quiz_id);

  if (qErr || !questions) {
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('pass_score')
    .eq('id', quiz_id)
    .single();

  // Calculate score server-side
  let score = 0;
  const totalPoints = questions.reduce((s: number, q: any) => s + q.points, 0);
  for (const q of questions as any[]) {
    if (answers[q.id] === q.correct_answer) score += q.points;
  }
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed     = percentage >= ((quiz as any)?.pass_score ?? 50);

  const { error: updateErr } = await supabase
    .from('student_quiz_attempts')
    .update({
      answers,
      score,
      total_points: totalPoints,
      percentage,
      passed,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attempt_id)
    .eq('student_id', user.id);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
  }

  return NextResponse.json({ score, total_points: totalPoints, percentage, passed });
}
