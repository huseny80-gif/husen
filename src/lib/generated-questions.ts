export interface GeneratedQuestion {
  question_text: string;
  options: { key: string; text: string }[];
  correct_answer: string;
  explanation: string;
  source_page: number;
  source_quote: string;
}
export function validateGeneratedQuestions(value: unknown, count: number, start: number, end: number): GeneratedQuestion[] {
  if (!Array.isArray(value) || value.length !== count) throw new Error('لم يُنتج المصدر العدد المطلوب من الأسئلة الموثقة. قلل العدد أو غيّر الصفحات.');
  for (const q of value) {
    if (!q || typeof q.question_text !== 'string' || !q.question_text.trim() || q.question_text.length > 4000 ||
      typeof q.explanation !== 'string' || !q.explanation.trim() || q.explanation.length > 8000 ||
      typeof q.source_quote !== 'string' || !q.source_quote.trim() || q.source_quote.length > 1500 ||
      !Number.isInteger(q.source_page) || q.source_page < start || q.source_page > end ||
      !Array.isArray(q.options) || ![2, 4].includes(q.options.length) ||
      q.options.some((o: {key: string; text: string}, i: number) => !o || o.key !== ['A','B','C','D'][i] || typeof o.text !== 'string' || !o.text.trim() || o.text.length > 2000) ||
      new Set(q.options.map((o: {text: string}) => o.text.trim())).size !== q.options.length ||
      !q.options.some((o: {key: string}) => o.key === q.correct_answer)) throw new Error('رُفضت أسئلة غير مكتملة أو بمراجع صفحات غير صحيحة.');
  }
  return value;
}
