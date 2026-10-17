'use client';

import { useParams } from 'next/navigation';
import { QuizBuilder } from '@/components/instructor/QuizBuilder';

export default function ChapterQuizPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  return <QuizBuilder chapterId={chapterId} />;
}
