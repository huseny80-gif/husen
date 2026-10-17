'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Course, Chapter } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CourseLibrary } from './CourseLibrary';
import { CourseCreator } from './CourseCreator';
import { ChapterManager } from './ChapterManager';
import { BookOpen, ChevronLeft, Plus, GraduationCap } from 'lucide-react';

export function InstructorDashboard() {
  const [tab, setTab] = useState<'chapters' | 'library'>('chapters');
  const [courses, setCourses]           = useState<Course[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCourse, setSelected]   = useState<Course | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  async function fetchMyCourses() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('instructor_courses')
      .select(`
        course_id,
        courses (
          id, grade_id, title, description, cover_url, is_active, sort_order,
          grades ( id, name, code )
        )
      `)
      .order('assigned_at', { ascending: false });

    if (error) {
      setError('حدث خطأ أثناء تحميل المواد');
    } else {
      const mapped = (data ?? [])
        .map((row: any) => row.courses)
        .filter(Boolean) as Course[];
      setCourses(mapped);
    }
    setLoading(false);
  }

  if (loading) return <DashboardSkeleton />;
  if (error)   return <ErrorState message={error} onRetry={fetchMyCourses} />;

  if (selectedCourse) {
    return (
      <ChapterManager
        course={selectedCourse}
        onBack={() => setSelected(null)}
      />
    );
  }

  const grades = Array.from(new Map(courses.map(course => [course.grade_id, {
    id: course.grade_id,
    name: course.grades?.name ?? `المرحلة ${course.grade_id}`,
  }])).values()).sort((a, b) => a.id - b.id);
  const visibleCourses = courses.filter(course => String(course.grade_id) === selectedGrade)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'ar'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 p-2.5 rounded-xl">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المدرب</h1>
            <p className="text-gray-500 text-sm">إدارة موادك الدراسية وفصولها</p>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="إدارة المواد" className="flex flex-wrap gap-3 mb-6">
        <button role="tab" aria-selected={tab === 'chapters'} onClick={() => setTab('chapters')} className="rounded-xl border bg-white px-5 py-3">الفصول والاختبارات</button>
        <button role="tab" aria-selected={tab === 'library'} onClick={() => setTab('library')} className="rounded-xl border bg-white px-5 py-3">مكتبة المواد</button>
      </div>
      <CourseCreator onCreated={fetchMyCourses} />
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="مواد المرحلة المختارة" value={visibleCourses.length} color="blue" />
        <StatCard label="المراحل الدراسية"  value={new Set(courses.map(c => c.grade_id)).size} color="purple" />
        <StatCard label="المواد النشطة في المرحلة" value={visibleCourses.filter(c => c.is_active).length} color="green" />
      </div>

      {courses.length > 0 && <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="grade-selector" className="mb-2 block font-bold text-gray-900">اختر المرحلة الدراسية</label>
        <select id="grade-selector" value={selectedGrade} onChange={event => setSelectedGrade(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 sm:max-w-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200">
          <option value="">حدد المرحلة الدراسية</option>
          {grades.map(grade => <option key={grade.id} value={String(grade.id)}>{grade.name}</option>)}
        </select>
        <p role="status" className="mt-3 text-sm text-gray-600">{selectedGrade
          ? `${grades.find(grade => String(grade.id) === selectedGrade)?.name}: ${visibleCourses.length} مادة`
          : 'اختر مرحلة لعرض موادها الدراسية فقط.'}</p>
      </div>}

      {tab === 'library' ? <CourseLibrary courses={visibleCourses} gradeSelected={!!selectedGrade} /> : <>
      {/* Courses Grid */}
      {courses.length === 0 ? (
        <EmptyState />
      ) : !selectedGrade ? (
        <Card className="py-12 text-center text-gray-500">حدد المرحلة الدراسية من القائمة أعلاه لبدء إدارة موادها.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onSelect={() => setSelected(course)}
            />
          ))}
        </div>
      )}
      </>}
    </div>
  );
}

// ─── Course Card ────────────────────────────────────────────
function CourseCard({ course, onSelect }: { course: Course; onSelect: () => void }) {
  const grade = (course as any).grades;
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onSelect}>
      <div className="flex items-start justify-between mb-3">
        <div className="bg-blue-100 p-3 rounded-xl">
          <BookOpen className="w-6 h-6 text-blue-600" />
        </div>
        <Badge
          label={course.is_active ? 'نشط' : 'موقوف'}
          color={course.is_active ? 'green' : 'gray'}
        />
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
        {course.title}
      </h3>
      {grade && (
        <p className="text-sm text-blue-600 font-medium mb-2">{grade.name}</p>
      )}
      {course.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{course.description}</p>
      )}
      <Button variant="ghost" size="sm" className="w-full justify-between border border-gray-200">
        إدارة الفصول
        <ChevronLeft className="w-4 h-4" />
      </Button>
    </Card>
  );
}

// ─── Chapter Manager wrapper (imported) ─────────────────────

// ─── Stat Card ──────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'purple' }) {
  const colors = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white`}>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-90">{label}</div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 animate-pulse" dir="rtl">
      <div className="h-10 bg-gray-200 rounded-xl w-64 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-white rounded-2xl" />)}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-16">
      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد مواد مكلف بها</h3>
      <p className="text-gray-400">تواصل مع الإدارة لتكليفك بالمواد الدراسية</p>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Card className="text-center py-10 max-w-md">
        <p className="text-red-600 mb-4">{message}</p>
        <Button onClick={onRetry}>إعادة المحاولة</Button>
      </Card>
    </div>
  );
}
