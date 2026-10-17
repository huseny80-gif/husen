// توليد أسئلة من نص المادة بخوارزميات محلية (بدون OpenAI أو أي API مدفوع)
// الاستراتيجيات: تعريف (MCQ) • ملء فراغ (MCQ) • صح/خطأ — وكلها مبنية على جمل النص نفسه.

import type { QuestionDraft, QuizOption } from './types';
import {
  type Token, buildFrequency, hasArabicIndicDigits, isKeywordToken, splitSentences,
  stripDiacritics, toArabicIndicDigits, toWesternDigits, tokenize,
} from './arabic-text';

export const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { key: 'A', text: 'صحيح' },
  { key: 'B', text: 'خطأ' },
];
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const BLANK = '______';

export interface GenerateOptions {
  count: number;     // عدد الأسئلة المطلوب
  tfRatio: number;   // نسبة أسئلة صح/خطأ من 0 إلى 1
  seed?: number;     // لتغيير النتائج عند "إعادة التوليد"
}

// ─── أدوات عامة ─────────────────────────────────────────────
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newUid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildMcq(
  questionText: string, correct: string, distractors: string[],
  explanation: string, excerpt: string, rng: () => number,
): QuestionDraft {
  const texts = shuffle([correct, ...distractors], rng);
  const options = texts.map((text, i) => ({ key: KEYS[i], text }));
  return {
    uid: newUid(),
    question_type: 'mcq',
    question_text: questionText,
    options,
    correct_answer: options[texts.indexOf(correct)].key,
    explanation,
    source_excerpt: excerpt,
    points: 1,
  };
}

function buildTrueFalse(statement: string, isTrue: boolean, explanation: string, excerpt: string): QuestionDraft {
  return {
    uid: newUid(),
    question_type: 'true_false',
    question_text: statement,
    options: TRUE_FALSE_OPTIONS.map(o => ({ ...o })),
    correct_answer: isTrue ? 'A' : 'B',
    explanation,
    source_excerpt: excerpt,
    points: 1,
  };
}

const cite = (sentence: string) => `جاء في المادة: «${sentence}»`;

// ─── سياق النص ──────────────────────────────────────────────
interface Context {
  freq: Map<string, number>;
  wordPool: Token[];               // كلمات مفتاحية فريدة من النص كله (لاختيار المشتّتات)
  definitions: { sentence: string; subject: string; predicate: string }[];
}

const DEFINITION_RE = /^(.{2,35}?)\s+(هو|هي|هم|هما)\s+(.{8,100})$/;

function parseDefinition(sentence: string) {
  const m = DEFINITION_RE.exec(sentence);
  if (!m) return null;
  const subject = m[1].trim();
  if (subject.split(' ').length > 4) return null;
  return { sentence, subject, predicate: m[3].trim() };
}

function buildContext(text: string, sentences: string[]): Context {
  const seen = new Set<string>();
  const wordPool: Token[] = [];
  for (const t of tokenize(text)) {
    if (isKeywordToken(t) && !seen.has(t.key)) {
      seen.add(t.key);
      wordPool.push(t);
    }
  }
  const definitions = sentences
    .map(parseDefinition)
    .filter((d): d is NonNullable<typeof d> => d !== null);
  return { freq: buildFrequency(text), wordPool, definitions };
}

// ─── اختيار المشتّتات ───────────────────────────────────────
// كلمتان من جذع واحد (الخلية/الخلايا) — لا تصلحان كمشتّت لبعضهما لأن كلتيهما قد تكون صحيحة
const sameStem = (a: string, b: string) =>
  a.slice(0, 2) === b.slice(0, 2) && Math.abs(a.length - b.length) <= 2;

function pickWordDistractors(answer: Token | { text: string; key: string }, sentenceKeys: Set<string>,
  ctx: Context, rng: () => number, n = 3): string[] {
  const answerHasAl = stripDiacritics(answer.text).startsWith('ال');
  const eligible = ctx.wordPool.filter(
    t => t.key !== answer.key && !sentenceKeys.has(t.key) && !sameStem(t.key, answer.key),
  );
  // نفضّل المفاهيم التي تكررت في النص؛ إن لم تكفِ نستعمل باقي الكلمات
  const frequent = eligible.filter(t => (ctx.freq.get(t.key) ?? 1) >= 2);
  return (frequent.length >= n ? frequent : eligible)
    .map(t => ({
      t,
      score:
        Math.abs(t.text.length - answer.text.length) +
        (stripDiacritics(t.text).startsWith('ال') === answerHasAl ? 0 : 2) -
        Math.min(ctx.freq.get(t.key) ?? 1, 4) * 0.8 +   // نفضّل المفاهيم المتكررة (أكثر معقولية كمشتّت)
        rng() * 2,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map(x => x.t.text);
}

function pickNumberDistractors(value: number, rng: () => number, n = 3): number[] {
  const isInt = Number.isInteger(value);
  const raw = isInt
    ? [value + 1, value - 1, value * 2, Math.round(value / 2), value + 10, value + 5, value * 10, value - 5]
    : [value * 2, value / 2, value + 1, value - 1, value * 10, value + 0.5];
  const uniq = [...new Set(raw.map(v => (isInt ? Math.round(v) : Number(v.toFixed(2)))))]
    .filter(v => v !== value && v >= 0);
  return shuffle(uniq, rng).slice(0, n);
}

const formatNumber = (n: number, arabicIndic: boolean) =>
  arabicIndic ? toArabicIndicDigits(String(n)) : String(n);

// ─── استراتيجيات التوليد ────────────────────────────────────
function makeDefinitionMcq(sentence: string, ctx: Context, rng: () => number): QuestionDraft | null {
  const def = parseDefinition(sentence);
  if (!def) return null;
  const others = shuffle(
    ctx.definitions.filter(d => d.subject !== def.subject && d.predicate !== def.predicate),
    rng,
  ).slice(0, 3);
  if (others.length < 3) return null;
  return buildMcq(
    `أيّ العبارات التالية تصف «${def.subject}» بشكل صحيح؟`,
    def.predicate,
    others.map(o => o.predicate),
    cite(sentence), sentence, rng,
  );
}

function makeClozeMcq(sentence: string, ctx: Context, rng: () => number): QuestionDraft | null {
  const tokens = tokenize(sentence);
  const sentenceKeys = new Set(tokens.map(t => t.key));

  const candidates = tokens
    .map((t, i) => {
      if (t.isNumber) return { t, score: 10 + rng() };
      if (!isKeywordToken(t)) return null;
      const f = ctx.freq.get(t.key) ?? 1;
      return { t, score: Math.min(f, 3) * 1.5 + Math.min(t.key.length, 8) / 4 + (i > 0 ? 0.5 : 0) + rng() };
    })
    .filter((c): c is { t: Token; score: number } => c !== null)
    .sort((a, b) => b.score - a.score);

  for (const { t } of candidates) {
    // فصل حروف الجر الملتصقة بـ"ال" (وال، بال، لل…) حتى لا تُحذف مع الإجابة
    const plain = stripDiacritics(t.text);
    const prefixMatch = plain === t.text ? /^([وفبلك])(ال.{3,})$/.exec(plain) : null;
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const answerText = prefixMatch ? prefixMatch[2] : t.text;

    let distractors: string[];
    let correct = answerText;

    if (t.isNumber) {
      const value = Number(toWesternDigits(t.text).replace(',', '.'));
      if (!Number.isFinite(value)) continue;
      const arabic = hasArabicIndicDigits(t.text);
      distractors = pickNumberDistractors(value, rng).map(v => formatNumber(v, arabic));
      correct = t.text;
    } else {
      distractors = pickWordDistractors({ text: answerText, key: t.key }, sentenceKeys, ctx, rng);
    }
    if (distractors.length < 3) continue;

    const blanked = sentence.slice(0, t.start) + prefix + BLANK + sentence.slice(t.end);
    return buildMcq(`أكمل الفراغ: ${blanked}`, correct, distractors, cite(sentence), sentence, rng);
  }
  return null;
}

function makeTrueFalse(sentence: string, makeFalse: boolean, ctx: Context, rng: () => number): QuestionDraft | null {
  if (!makeFalse) return buildTrueFalse(sentence, true, cite(sentence), sentence);

  const tokens = tokenize(sentence);
  const sentenceKeys = new Set(tokens.map(t => t.key));
  const numberToken = tokens.find(t => t.isNumber);

  let start = -1, end = -1, replacement = '';
  if (numberToken) {
    const value = Number(toWesternDigits(numberToken.text).replace(',', '.'));
    const [alt] = Number.isFinite(value) ? pickNumberDistractors(value, rng, 1) : [];
    if (alt !== undefined) {
      start = numberToken.start; end = numberToken.end;
      replacement = formatNumber(alt, hasArabicIndicDigits(numberToken.text));
    }
  }
  if (start < 0) {
    const best = tokens
      .filter(isKeywordToken)
      .sort((a, b) => (ctx.freq.get(b.key) ?? 0) - (ctx.freq.get(a.key) ?? 0))[0];
    if (best) {
      const [alt] = pickWordDistractors(best, sentenceKeys, ctx, rng, 1);
      if (alt) { start = best.start; end = best.end; replacement = alt; }
    }
  }
  if (start < 0) return null;

  const falseStatement = sentence.slice(0, start) + replacement + sentence.slice(end);
  return buildTrueFalse(falseStatement, false, `العبارة الصحيحة: «${sentence}»`, sentence);
}

// ─── الدالة الرئيسية ────────────────────────────────────────
export function generateQuestions(text: string, opts: GenerateOptions): QuestionDraft[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const rng = makeRng(opts.seed ?? 1);
  const ctx = buildContext(text, sentences);
  const count = Math.max(1, Math.min(opts.count, sentences.length));
  const tfTarget = Math.round(count * Math.min(Math.max(opts.tfRatio, 0), 1));

  const results: QuestionDraft[] = [];
  const usedQuestions = new Set<string>();
  let tfDone = 0;

  for (const sentence of shuffle(sentences, rng)) {
    if (results.length >= count) break;

    const remainingSlots = count - results.length;
    const wantTF = rng() < (tfTarget - tfDone) / remainingSlots;

    const tryTF = () => makeTrueFalse(sentence, rng() < 0.5, ctx, rng);
    const tryMcq = () => {
      const first = rng() < 0.5 ? makeDefinitionMcq : makeClozeMcq;
      const second = first === makeDefinitionMcq ? makeClozeMcq : makeDefinitionMcq;
      return first(sentence, ctx, rng) ?? second(sentence, ctx, rng);
    };

    const attempts = wantTF ? [tryTF, tryMcq] : [tryMcq, tryTF];
    for (const attempt of attempts) {
      const draft = attempt();
      if (draft && !usedQuestions.has(draft.question_text)) {
        usedQuestions.add(draft.question_text);
        results.push(draft);
        if (draft.question_type === 'true_false') tfDone++;
        break;
      }
    }
  }
  return results;
}

// ─── إدخال بنك أسئلة جاهز (لصق نص بصيغة بسيطة) ─────────────
// الصيغة:
//   س: نص السؤال
//   أ) خيار   ب) خيار   ج) خيار   د) خيار   (كل خيار في سطر)
//   الإجابة: ب
//   التفسير: شرح مختصر
// وسؤال صح/خطأ: س: العبارة ... ثم  الإجابة: صح  (بدون خيارات)
const LETTER_KEY: Record<string, string> = {
  'أ': 'A', 'ا': 'A', 'إ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'ه': 'E', 'هـ': 'E',
};
const Q_RE   = /^\s*(?:س|سؤال|السؤال|Q|Question)\s*\d*\s*[:：.\-)]\s*(.+)$/i;
const OPT_RE = /^\s*([أاإبجدهـ]|[A-Fa-f])\s*[).:\-،]\s*(.+)$/;
const ANS_RE = /^\s*(?:الإجابة الصحيحة|الإجابة|الاجابة|الجواب|Answer|Ans)\s*[:：-]\s*(.+)$/i;
const EXP_RE = /^\s*(?:التفسير|الشرح|التوضيح|Explanation)\s*[:：-]\s*(.+)$/i;

export interface ParseResult {
  drafts: QuestionDraft[];
  errors: { index: number; message: string }[];
}

export function parseQuestionBank(raw: string): ParseResult {
  const drafts: QuestionDraft[] = [];
  const errors: ParseResult['errors'] = [];

  type Block = { q: string; options: QuizOption[]; answer: string; exp: string };
  let cur: Block | null = null;
  let last: 'q' | 'exp' | 'opt' | null = null;
  let blockNo = 0;

  const finish = () => {
    if (!cur) return;
    const b = cur; cur = null;
    const draft = blockToDraft(b);
    if ('error' in draft) errors.push({ index: blockNo, message: draft.error });
    else drafts.push(draft);
  };

  for (const line of raw.replace(/\r/g, '').split('\n')) {
    if (!line.trim() || /^\s*[-=]{3,}\s*$/.test(line)) { last = null; continue; }

    const q = Q_RE.exec(line);
    if (q) {
      finish();
      blockNo++;
      cur = { q: q[1].trim(), options: [], answer: '', exp: '' };
      last = 'q';
      continue;
    }
    if (!cur) continue;

    const ans = ANS_RE.exec(line);
    if (ans) { cur.answer = ans[1].trim(); last = null; continue; }
    const exp = EXP_RE.exec(line);
    if (exp) { cur.exp = exp[1].trim(); last = 'exp'; continue; }
    const opt = OPT_RE.exec(line);
    if (opt) {
      const key = LETTER_KEY[opt[1]] ?? opt[1].toUpperCase();
      cur.options.push({ key, text: opt[2].trim() });
      last = 'opt';
      continue;
    }
    // سطر متابعة
    if (last === 'q') cur.q += ' ' + line.trim();
    else if (last === 'exp') cur.exp += ' ' + line.trim();
    else if (last === 'opt') cur.options[cur.options.length - 1].text += ' ' + line.trim();
  }
  finish();
  return { drafts, errors };
}

function blockToDraft(b: { q: string; options: QuizOption[]; answer: string; exp: string }):
  QuestionDraft | { error: string } {
  const ansNorm = stripDiacritics(b.answer).trim();
  const isTrue  = /^(صح|صحيح|صحيحة|true|t)$/i.test(ansNorm);
  const isFalse = /^(خطأ|خطا|خاطئ|خاطئة|false|f)$/i.test(ansNorm);

  let draft: QuestionDraft;
  if (b.options.length === 0) {
    if (!isTrue && !isFalse) return { error: `«${b.q.slice(0, 30)}…»: اكتب الإجابة (صح أو خطأ) أو أضف خيارات` };
    draft = buildTrueFalse(b.q, isTrue, b.exp, '');
  } else {
    const key = LETTER_KEY[ansNorm] ?? ansNorm.toUpperCase();
    draft = {
      uid: newUid(), question_type: 'mcq', question_text: b.q,
      options: b.options, correct_answer: key, explanation: b.exp, points: 1,
    };
  }
  draft.explanation = b.exp;
  const problems = validateDraft(draft);
  return problems.length ? { error: `«${b.q.slice(0, 30)}…»: ${problems[0]}` } : draft;
}

// ─── التحقق من صلاحية السؤال قبل الحفظ ─────────────────────
export function validateDraft(d: QuestionDraft): string[] {
  const errors: string[] = [];
  if (!d.question_text.trim()) errors.push('نص السؤال فارغ');
  if (d.options.length < 2) errors.push('يجب وجود خيارين على الأقل');
  if (d.options.some(o => !o.text.trim())) errors.push('يوجد خيار فارغ');
  const texts = d.options.map(o => o.text.trim());
  if (new Set(texts).size !== texts.length) errors.push('يوجد خياران متطابقان');
  if (!d.options.some(o => o.key === d.correct_answer)) errors.push('الإجابة الصحيحة غير موجودة بين الخيارات');
  return errors;
}
