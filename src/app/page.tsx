import Link from 'next/link';
import { GraduationCap, BookOpen, BarChart2, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" dir="rtl">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-20 text-center text-white">
        <div className="flex justify-center mb-6">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
            <GraduationCap className="w-14 h-14 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
          المنصة التعليمية للمرحلة الإعدادية
        </h1>
        <p className="text-blue-200 text-xl mb-10 max-w-2xl mx-auto">
          بيئة تعليمية متكاملة تضم مواد الصف الرابع والخامس والسادس الإعدادي
          مع اختبارات تفاعلية وتتبع التقدم
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-blue-600" />}
            title="لوحة تحكم المدرب"
            desc="إدارة الفصول والمحتوى والاختبارات بصلاحيات محدودة لكل مادة"
            href="/instructor/dashboard"
            btnLabel="دخول المدرب"
          />
          <FeatureCard
            icon={<BookOpen className="w-6 h-6 text-green-600" />}
            title="الاختبارات التفاعلية"
            desc="اختبارات اختيار من متعدد مع تصحيح فوري وتفسير علمي لكل سؤال"
            href="/student/quiz/demo"
            btnLabel="جرّب اختباراً"
            color="green"
          />
          <FeatureCard
            icon={<BarChart2 className="w-6 h-6 text-purple-600" />}
            title="سجل التقدم"
            desc="متابعة نتائج الطالب ودرجاته وإحصائياته عبر الزمن"
            href="/student/progress"
            btnLabel="عرض التقدم"
            color="purple"
          />
        </div>

        {/* Grade Badges */}
        <div className="flex justify-center gap-3 mt-14 flex-wrap">
          {['الرابع الإعدادي','الخامس الإعدادي','السادس الإعدادي'].map(g => (
            <span key={g} className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-5 py-2 rounded-full font-semibold text-sm">
              {g}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc, href, btnLabel, color = 'blue' }: {
  icon: React.ReactNode; title: string; desc: string;
  href: string; btnLabel: string; color?: string;
}) {
  const btnColors: Record<string, string> = {
    blue:   'bg-blue-600 hover:bg-blue-700',
    green:  'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg text-gray-900">
      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-5 leading-relaxed">{desc}</p>
      <Link
        href={href}
        className={`${btnColors[color]} text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors inline-block`}
      >
        {btnLabel}
      </Link>
    </div>
  );
}
