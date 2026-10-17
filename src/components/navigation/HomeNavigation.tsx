'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';

export function HomeNavigation() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <nav aria-label="التنقل الرئيسي" className="border-b border-blue-100 bg-white px-4 py-3 sm:px-6">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={event => {
          if (pathname.startsWith('/student/quiz/') && !window.confirm('العودة إلى الرئيسية ستغادر صفحة الاختبار. قد تفقد الإجابات التي لم تُرسل. هل تريد المتابعة؟')) {
            event.preventDefault();
          }
        }}
      >
        <Home aria-hidden="true" className="h-5 w-5" />
        الرئيسية
      </Link>
    </nav>
  );
}
