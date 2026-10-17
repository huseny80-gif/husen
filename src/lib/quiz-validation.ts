export function validateQuiz(title: string, passScore: number, minutes: number | null): string | null {
  if (!title.trim()) return 'أدخل عنوان الاختبار.';
  if (!Number.isInteger(passScore) || passScore < 0 || passScore > 100) return 'نسبة النجاح يجب أن تكون عددًا صحيحًا بين 0 و100.';
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1)) return 'المدة يجب أن تكون عددًا صحيحًا موجبًا، أو اتركها فارغة.';
  return null;
}
export function validateQuestion(text: string, options: {key: string; text: string}[], answer: string, points: number): string | null {
  if (!text.trim()) return 'أدخل نص السؤال.';
  if (options.length !== 4 || options.some(o => !o.text.trim())) return 'أكمل الخيارات الأربعة.';
  if (new Set(options.map(o => o.text.trim())).size !== options.length) return 'يجب أن تكون الخيارات مختلفة.';
  if (!options.some(o => o.key === answer)) return 'اختر الإجابة الصحيحة.';
  if (!Number.isInteger(points) || points < 1) return 'درجة السؤال يجب أن تكون عددًا صحيحًا موجبًا.';
  return null;
}
