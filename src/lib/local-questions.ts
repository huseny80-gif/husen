import { GeneratedQuestion } from './generated-questions';
import { generateQuestions } from './question-generator';

// Extractive practice only: every question is built from sentences of the saved source text
// (definition / fill-in-the-blank / true-false). No external AI service or API key is used.
export function generateLocalQuestions(text: string, count: number, tfRatio = 0.25): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('اختر من سؤال واحد إلى عشرة أسئلة.');
  // seed متغيّر: كل ضغطة "إنشاء" تعطي مجموعة أسئلة مختلفة من نفس النص
  const questions = generateQuestions(text, { count, tfRatio, seed: Date.now() % 1_000_000 });
  if (!questions.length) throw new Error('النص لا يحتوي جملًا وكلمات كافية لصنع أسئلة. أضف نص الدرس الواضح (جمل كاملة تنتهي بنقطة) واحفظه كمصدر نصي.');
  return questions;
}
