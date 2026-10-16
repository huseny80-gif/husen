'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProgressDashboard } from '@/components/student/ProgressDashboard';

export default function ProgressPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStudentId(data.user?.id ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-gray-600">يجب تسجيل الدخول لعرض سجل التقدم</p>
      </div>
    );
  }

  return <ProgressDashboard studentId={studentId} />;
}
