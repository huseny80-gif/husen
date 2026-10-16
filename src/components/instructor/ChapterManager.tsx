'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Course, Chapter } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ChevronRight, Plus, BookOpen, FileText,
  Lightbulb, Trash2, Edit3, Check, X
} from 'lucide-react';

interface Props {
  course: Course;
  onBack: () => void;
}

export function ChapterManager({ course, onBack }: Props) {
  const [chapters, setChapters]         = useState<Chapter[]>([]);
  const [loading, setLoading]           = useState(true);
  const [addingChapter, setAdding]      = useState(false);
  const [newTitle, setNewTitle]         = useState('');
  const [newDesc, setNewDesc]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editTitle, setEditTitle]       = useState('');

  useEffect(() => {
    fetchChapters();
  }, [course.id]);

  async function fetchChapters() {
    setLoading(true);
    const { data } = await supabase
      .from('chapters')
      .select('*, contents(*), quizzes(id, title)')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true });
    setChapters((data ?? []) as Chapter[]);
    setLoading(false);
  }

  async function addChapter() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const maxOrder = chapters.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { error } = await supabase.from('chapters').insert({
      course_id: course.id,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      sort_order: maxOrder + 1,
    });
    if (!error) {
      setNewTitle('');
      setNewDesc('');
      setAdding(false);
      await fetchChapters();
    }
    setSaving(false);
  }

  async function deleteChapter(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;
    await supabase.from('chapters').delete().eq('id', id);
    setChapters(prev => prev.filter(c => c.id !== id));
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    const { error } = await supabase
      .from('chapters')
      .update({ title: editTitle.trim() })
      .eq('id', id);
    if (!error) {
      setChapters(prev => prev.map(c => c.id === id ? { ...c, title: editTitle } : c));
      setEditingId(null);
    }
  }

  const grade = (course as any).grades;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button onClick={onBack} className="hover:text-blue-600 font-medium transition-colors">
          لوحة التحكم
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-semibold">{course.title}</span>
        {grade && <span className="text-blue-600">({grade.name})</span>}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {chapters.length} فصل · {chapters.reduce((s, c) => s + ((c.quizzes as any[])?.length ?? 0), 0)} اختبار
          </p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={addingChapter}>
          <Plus className="w-4 h-4" />
          إضافة فصل جديد
        </Button>
      </div>

      {/* Add Chapter Form */}
      {addingChapter && (
        <Card className="mb-5 border-2 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-gray-800 mb-3">إضافة فصل جديد</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="عنوان الفصل *"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              autoFocus
            />
            <textarea
              placeholder="وصف الفصل (اختياري)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={addChapter} loading={saving} size="sm">
                <Check className="w-4 h-4" /> حفظ
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); }}>
                <X className="w-4 h-4" /> إلغاء
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Chapters List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : chapters.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد فصول بعد. ابدأ بإضافة فصل جديد.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, idx) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              index={idx + 1}
              isEditing={editingId === chapter.id}
              editTitle={editTitle}
              onEditStart={() => { setEditingId(chapter.id); setEditTitle(chapter.title); }}
              onEditChange={setEditTitle}
              onEditSave={() => saveEdit(chapter.id)}
              onEditCancel={() => setEditingId(null)}
              onDelete={() => deleteChapter(chapter.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chapter Row ─────────────────────────────────────────────
interface ChapterRowProps {
  chapter: Chapter;
  index: number;
  isEditing: boolean;
  editTitle: string;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

function ChapterRow({
  chapter, index, isEditing, editTitle,
  onEditStart, onEditChange, onEditSave, onEditCancel, onDelete
}: ChapterRowProps) {
  const contents = (chapter.contents as any[]) ?? [];
  const quizzes  = (chapter.quizzes  as any[]) ?? [];
  const summaries = contents.filter(c => c.content_type === 'summary').length;
  const tips      = contents.filter(c => c.content_type === 'tip').length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-blue-600 text-white text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            {index}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => onEditChange(e.target.value)}
                  className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel(); }}
                />
                <button onClick={onEditSave}   className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                <button onClick={onEditCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <h4 className="font-semibold text-gray-900 truncate">{chapter.title}</h4>
            )}
            {chapter.description && !isEditing && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{chapter.description}</p>
            )}
            {/* Stats badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {summaries > 0 && (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <FileText className="w-3 h-3" /> {summaries} ملخص
                </span>
              )}
              {tips > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                  <Lightbulb className="w-3 h-3" /> {tips} نصيحة
                </span>
              )}
              {quizzes.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  📝 {quizzes.length} اختبار
                </span>
              )}
            </div>
          </div>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEditStart}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="تعديل"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
