import { GeneratedQuestion } from './generated-questions';

// Extractive practice only: answers and distractors are copied from the source.
export function generateLocalQuestions(text: string, count: number): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('اختر من سؤال واحد إلى عشرة أسئلة.');
  const sentences = text.split(/(?:[.!؟?؛\n]+)\s*/).map(s => s.trim()).filter(s => s.length >= 35 && s.length <= 500);
  const words = (s: string) => s.match(/[A-Za-z\u0621-\u064A]{4,}/g) ?? [];
  const pool = Array.from(new Set(sentences.flatMap(words)));
  const questions: GeneratedQuestion[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    if (seen.has(sentence) || /\\|\$|[=<>]/.test(sentence)) continue;
    const answer = words(sentence).filter(word => pool.some(other => other !== word && !sentence.includes(other))).sort((a,b) => b.length-a.length)[0];
    if (!answer) continue;
    const alternatives = pool.filter(word => word !== answer && !sentence.includes(word)).slice(0, 3);
    if (alternatives.length < 3) continue;
    const correctIndex = questions.length % 4;
    const choices = [...alternatives]; choices.splice(correctIndex, 0, answer);
    questions.push({ question_text: 'أكمل النص كما ورد في المصدر: ' + sentence.replace(answer, '________'), options: choices.map((word,i) => ({ key: String.fromCharCode(65+i), text: word })), correct_answer: String.fromCharCode(65+correctIndex), explanation: `الكلمة الواردة في النص هي «${answer}». النص الأصلي: ${sentence}`, source_page: 1, source_quote: sentence });
    seen.add(sentence);
    if (questions.length === count) break;
  }
  if (!questions.length) throw new Error('النص لا يحتوي جملًا وكلمات كافية لصنع أسئلة إكمال. أضف نص الدرس الواضح واحفظه كمصدر نصي.');
  return questions;
}
