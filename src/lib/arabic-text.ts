// أدوات معالجة النص العربي المستخدمة في استخلاص الأسئلة (بدون أي خدمة خارجية)

const DIACRITICS = /[ً-ٰٟـ]/g; // التشكيل + التطويل

export const stripDiacritics = (s: string) => s.replace(DIACRITICS, '');

export const toWesternDigits = (s: string) =>
  s.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));

export const toArabicIndicDigits = (s: string) =>
  s.replace(/[0-9]/g, d => String.fromCharCode(0x0660 + Number(d)));

export const hasArabicIndicDigits = (s: string) => /[٠-٩]/.test(s);

/** مفتاح مقارنة للكلمة: بدون تشكيل، همزات موحّدة، بدون "ال" التعريف */
export function normalizeWord(w: string): string {
  let k = stripDiacritics(w)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
  if (k.startsWith('ال') && k.length > 4) k = k.slice(2);
  return k;
}

const STOPWORDS = new Set(
  (
    'في من على إلى الى عن أن ان إن كان كانت يكون تكون هذا هذه ذلك تلك هؤلاء التي الذي الذين اللذان ' +
    'هو هي هم هن هما ما لا لم لن قد كل بعض مع أو او و ثم حتى إذا اذا عند عندما بين أي اي كما لكن غير ' +
    'بعد قبل خلال حيث هناك نحو ضمن عليه عليها منه منها فيه فيها به بها له لها أيضا أيضاً إذ إلا الا ' +
    'عنها عنه فقط جدا جداً كذلك لذلك بذلك هنا هنالك يمكن يتم تتم يعد تعد يعتبر تعتبر ليس ليست كانوا ' +
    'the a an of in on to and or is are was were be been it this that these those with for by as at'
  )
    .split(/\s+/)
    .map(normalizeWord)
);

export const isStopword = (w: string) => STOPWORDS.has(normalizeWord(w));

export interface Token {
  text: string;
  start: number;
  end: number;
  key: string;
  isNumber: boolean;
}

const TOKEN_RE =
  /[ء-يٱً-ٰٟـ]+|[A-Za-z]+|[0-9٠-٩]+(?:[.,٫][0-9٠-٩]+)?/g;

export function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  for (const m of sentence.matchAll(TOKEN_RE)) {
    const text = m[0];
    const isNumber = /^[0-9٠-٩]/.test(text);
    tokens.push({
      text,
      start: m.index ?? 0,
      end: (m.index ?? 0) + text.length,
      key: isNumber ? toWesternDigits(text) : normalizeWord(text),
      isNumber,
    });
  }
  return tokens;
}

/** تقسيم النص إلى جمل صالحة لاشتقاق الأسئلة منها */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!؟?؛])\s+|\n+/)
    .map(s =>
      s
        .replace(/^[\s\-•*·▪◦●]+/, '')
        .replace(/^\(?[0-9٠-٩]{1,2}[).\-]\s+/, '')
        .replace(/[.!؛]+$/, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(s => {
      if (s.length < 20 || /[؟?]$/.test(s)) return false;
      const words = s.split(' ').length;
      return words >= 5 && words <= 40;
    });
}

/** تكرار كل كلمة (بعد التطبيع) في النص كاملاً — الكلمات المتكررة غالباً مفاهيم أساسية */
export function buildFrequency(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) {
    if (t.isNumber) continue;
    freq.set(t.key, (freq.get(t.key) ?? 0) + 1);
  }
  return freq;
}

export const isKeywordToken = (t: Token) =>
  !t.isNumber && t.key.length >= 3 && !isStopword(t.text);
