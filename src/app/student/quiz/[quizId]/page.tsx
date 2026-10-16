'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizView } from '@/components/student/QuizView';

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStudentId(data.user?.id ?? null);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول للوصول إلى الاختبار</p>
          <a href="/login" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold">
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  return <QuizView quizId={quizId} studentId={studentId} />;
}
