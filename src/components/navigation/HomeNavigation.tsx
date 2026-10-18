'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ArrowRight, LineChart, ShieldCheck } from 'lucide-react';

// شريط التنقل الموحّد لصفحات المنصة (المدرب، الاختبارات، سجل التقدم) ويطابق شريط الواجهة الرئيسية.
export function HomeNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/') return null;

  const leavingQuiz = (event: React.MouseEvent) => {
    if (pathname.startsWith('/student/quiz/') &&
        !window.confirm('مغادرة الصفحة ستفقد الإجابات التي لم تُرسل. هل تريد المتابعة؟')) {
      event.preventDefault();
      return false;
    }
    return true;
  };
  const btn = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

  return (
    <nav aria-label="التنقل الرئيسي" className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-white px-4 py-3 sm:px-6">
      <button
        type="button"
        className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200`}
        onClick={event => { if (leavingQuiz(event)) { if (window.history.length > 1) router.back(); else router.push('/platform.html'); } }}
      >
        <ArrowRight aria-hidden="true" className="h-5 w-5" />
        رجوع
      </button>
      <div className="flex flex-wrap gap-2">
        <a href="/platform.html" className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} onClick={leavingQuiz}>
          <Home aria-hidden="true" className="h-5 w-5" />
          الرئيسية
        </a>
        <Link href="/student/progress" className={`${btn} bg-purple-50 text-purple-800 hover:bg-purple-100`} onClick={leavingQuiz}>
          <LineChart aria-hidden="true" className="h-5 w-5" />
          سجل التقدم
        </Link>
        <Link href="/instructor/dashboard" className={`${btn} bg-green-50 text-green-800 hover:bg-green-100`} onClick={leavingQuiz}>
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          المدرب
        </Link>
      </div>
    </nav>
  );
}
