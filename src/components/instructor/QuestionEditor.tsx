'use client';

import { QuestionDraft, QuestionType } from '@/lib/types';
import { TRUE_FALSE_OPTIONS, validateDraft } from '@/lib/question-generator';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Props {
  draft: QuestionDraft;
  index?: number;
  onChange: (d: QuestionDraft) => void;
  onDelete?: () => void;
}

export function blankDraft(type: QuestionType, uid: string): QuestionDraft {
  return {
    uid,
    question_type: type,
    question_text: '',
    options: type === 'true_false'
      ? TRUE_FALSE_OPTIONS.map(o => ({ ...o }))
      : KEYS.slice(0, 4).map(key => ({ key, text: '' })),
    correct_answer: 'A',
    explanation: '',
    points: 1,
  };
}

export function QuestionEditor({ draft, index, onChange, onDelete }: Props) {
  const errors = validateDraft(draft);
  const set = (patch: Partial<QuestionDraft>) => onChange({ ...draft, ...patch });

  const changeType = (type: QuestionType) => {
    if (type === draft.question_type) return;
    const fresh = blankDraft(type, draft.uid);
    set({ question_type: type, options: fresh.options, correct_answer: 'A' });
  };

  const setOptionText = (i: number, text: string) =>
    set({ options: draft.options.map((o, idx) => (idx === i ? { ...o, text } : o)) });

  const removeOption = (i: number) => {
    const correctIdx = draft.options.findIndex(o => o.key === draft.correct_answer);
    const next = draft.options.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, key: KEYS[idx] }));
    const newCorrectIdx = i === correctIdx ? 0 : i < correctIdx ? correctIdx - 1 : correctIdx;
    set({ options: next, correct_answer: KEYS[newCorrectIdx] });
  };

  const addOption = () =>
    set({ options: [...draft.options, { key: KEYS[draft.options.length], text: '' }] });

  return (
    <div className={clsx('rounded-xl border-2 p-4 bg-white', errors.length ? 'border-amber-300' : 'border-gray-200')}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{index}</span>
          )}
          <select
            value={draft.question_type}
            onChange={e => changeType(e.target.value as QuestionType)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="mcq">اختيار من متعدد</option>
            <option value="true_false">صح / خطأ</option>
          </select>
          <label className="text-xs text-gray-500 flex items-center gap-1">
            النقاط
            <input
              type="number" min={1} max={10} value={draft.points}
              onChange={e => set({ points: Math.max(1, Number(e.target.value) || 1) })}
              className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm"
            />
          </label>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors" title="حذف السؤال">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <textarea
        value={draft.question_text}
        onChange={e => set({ question_text: e.target.value })}
        rows={2}
        placeholder={draft.question_type === 'true_false' ? 'اكتب العبارة المراد الحكم عليها' : 'نص السؤال'}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />

      {draft.question_type === 'true_false' ? (
        <div className="flex gap-3 mb-3">
          {draft.options.map(o => (
            <label
              key={o.key}
              className={clsx(
                'flex-1 text-center cursor-pointer rounded-lg border-2 py-2 text-sm font-semibold transition-colors',
                draft.correct_answer === o.key
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              <input
                type="radio" className="sr-only" checked={draft.correct_answer === o.key}
                onChange={() => set({ correct_answer: o.key })}
              />
              {o.text}
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {draft.options.map((o, i) => (
            <div key={o.key} className="flex items-center gap-2">
              <input
                type="radio" name={`correct-${draft.uid}`} checked={draft.correct_answer === o.key}
                onChange={() => set({ correct_answer: o.key })}
                title="الإجابة الصحيحة" className="accent-green-600"
              />
              <span className={clsx(
                'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0',
                draft.correct_answer === o.key ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              )}>{o.key}</span>
              <input
                value={o.text} onChange={e => setOptionText(i, e.target.value)}
                placeholder={`الخيار ${o.key}`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              {draft.options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {draft.options.length < KEYS.length && (
            <button onClick={addOption} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> إضافة خيار
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500 mt-2 shrink-0" />
        <textarea
          value={draft.explanation} onChange={e => set({ explanation: e.target.value })}
          rows={2} placeholder="💡 التفسير العلمي الذي يظهر للطالب بعد الإجابة"
          className="flex-1 border border-amber-200 bg-amber-50/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
        />
      </div>

      {errors.length > 0 && (
        <p className="text-xs text-amber-700 mt-2">⚠ {errors.join(' • ')}</p>
      )}
    </div>
  );
}
