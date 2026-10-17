// استخراج نص صفحات PDF على الخادم (بدون OCR أو أي خدمة خارجية).
// يعمل مع ملفات PDF التي تحتوي نصاً قابلاً للتحديد؛ الملفات المصورة (صور ممسوحة) لا نص فيها.

import { getDocumentProxy } from 'unpdf';

export const MAX_PAGES_PER_EXTRACT = 10;
export const PAGE_MARKER = (n: number) => `[صفحة ${n}]`;
const MIN_CHARS_PER_PAGE = 40;

export interface ExtractedPages {
  totalPages: number;
  pages: { page: number; text: string }[];
  warnings: string[];
}

const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿­]/g;
const SENTENCE_END = /[.!؟?؛:…]$/;

/** NFKC يحوّل أشكال الحروف العربية المعروضة (ﻻ، ﺑ …) إلى الحروف الأصلية */
export function cleanLine(s: string): string {
  return s.normalize('NFKC').replace(INVISIBLE, '').replace(/[ \t]+/g, ' ').trim();
}

// عنوان قصير بلا علامة ترقيم: يبقى سطراً مستقلاً ولا يُدمج مع الفقرة التي بعده
const isHeading = (l: string) => l.length < 28 && l.split(' ').length <= 4 && !SENTENCE_END.test(l);

/** إعادة تجميع الأسطر المقطوعة بفعل عرض الصفحة إلى جمل كاملة */
export function reflow(lines: string[]): string {
  const out: string[] = [];
  let buf = '';
  const flush = () => { if (buf) out.push(buf); buf = ''; };
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line || /^[0-9٠-٩]{1,4}$/.test(line)) { flush(); continue; } // أسطر فارغة وأرقام صفحات
    if (isHeading(line)) { flush(); out.push(line); continue; }
    buf = buf ? `${buf} ${line}` : line;
    if (SENTENCE_END.test(line)) flush();
  }
  flush();
  return out.join('\n');
}

interface TextItem { str: string; dir?: string; hasEOL?: boolean; transform?: number[] }

/** تجميع العناصر في أسطر بحسب الإحداثي الرأسي مع الإبقاء على ترتيبها البصري */
function groupLines(items: TextItem[]): TextItem[][] {
  const lines: TextItem[][] = [];
  let cur: TextItem[] = [];
  let lastY: number | null = null;
  for (const it of items) {
    const y = it.transform?.[5] ?? null;
    if (cur.length && lastY !== null && y !== null && Math.abs(y - lastY) > 2) { lines.push(cur); cur = []; }
    cur.push(it);
    if (y !== null) lastY = y;
    if (it.hasEOL) { lines.push(cur); cur = []; lastY = null; }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

const joinAsIs = (line: TextItem[]) => line.map(i => i.str).join('');

/**
 * ملفات PDF العربية تُرتّب العناصر بصرياً (يسار→يمين) بينما نص كل عنصر منطقي أصلاً.
 * نعكس ترتيب العناصر، ونُبقي مقاطع LTR المتجاورة (أرقام/لاتيني) بترتيبها الأصلي.
 */
function joinLogical(line: TextItem[]): string {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => { if (run.length) { out.push(run.join('')); run = []; } };
  const items = [...line].reverse().filter(it => it.str !== '');
  items.forEach((it, i) => {
    const isSpace = it.str.trim() === '';
    const nextIsLtrWord = items[i + 1]?.dir === 'ltr' && items[i + 1].str.trim() !== '';
    if (it.dir === 'ltr' && !isSpace) run.unshift(it.str);
    // مسافة بين كلمتين لاتينيتين/رقمين تبقى داخل مقطعهما؛ وغير ذلك مسافة عربية عادية
    else if (isSpace && run.length && nextIsLtrWord) run.unshift(it.str);
    else { flush(); out.push(it.str); }
  });
  flush();
  return out.join('');
}

const ARABIC_CHAR = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const MIRRORED: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' };

const isMostlyArabic = (s: string) => {
  const arabic = (s.match(ARABIC_CHAR) ?? []).length;
  return arabic > 0 && arabic >= s.replace(/[\s\d.,;:!?()\[\]{}«»"'،؛؟\-]/g, '').length / 2;
};

/**
 * كثير من ملفات PDF العربية تخزّن الحروف بترتيبها البصري (من اليسار لليمين) وبأشكال العرض.
 * نعكس السطر قبل تفكيك الروابط (NFKC) حتى لا ينقلب ترتيب «لأ»، ثم نعيد الأرقام واللاتينية لاتجاهها.
 */
export function visualToLogical(line: string): string {
  if (!isMostlyArabic(line)) return line;
  const reversed = Array.from(line).reverse().map(c => MIRRORED[c] ?? c).join('');
  return reversed.replace(
    /[A-Za-z0-9\u0660-\u0669]+(?:[.,:/\-][A-Za-z0-9\u0660-\u0669]+)*/g,
    run => Array.from(run).reverse().join(''),
  );
}

// في النص العربي السليم تبدأ كلمات كثيرة بـ«ال»؛ في النص المعكوس تظهر «لا» في نهايات الكلمات بدلاً منها
const arabicQuality = (text: string) => (text.match(/(^|\s)ال(?=[\u0621-\u064A])/g) ?? []).length;

// ثلاث قراءات محتملة للصفحة؛ نختار الأقرب إلى عربية سليمة (كلمات تبدأ بـ«ال»)
function pageText(lines: TextItem[][]): string {
  const candidates = [
    reflow(lines.map(joinAsIs)),
    reflow(lines.map(joinLogical)),
    reflow(lines.map(l => visualToLogical(joinAsIs(l)))),
  ];
  return candidates.reduce((best, c) => (arabicQuality(c) > arabicQuality(best) ? c : best));
}

/** بيانات الملف مباشرة، أو رابط يدعم Range فتُقرأ الصفحات المطلوبة فقط (مهم لملفات المكتبة الكبيرة) */
export type PdfSource = Uint8Array | { url: string };

export async function extractPdfPages(
  source: PdfSource, start: number, end: number,
): Promise<ExtractedPages> {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start >= MAX_PAGES_PER_EXTRACT) {
    throw new Error(`اختر نطاقاً من 1 إلى ${MAX_PAGES_PER_EXTRACT} صفحات.`);
  }
  const pdf = source instanceof Uint8Array
    ? await getDocumentProxy(source)
    : await getDocumentProxy(undefined as unknown as Uint8Array, {
        url: source.url, disableAutoFetch: true, disableStream: true, rangeChunkSize: 131072,
      });
  try {
    if (end > pdf.numPages) throw new Error(`الملف يحتوي ${pdf.numPages} صفحة فقط.`);
    const pages: ExtractedPages['pages'] = [];
    const warnings: string[] = [];
    for (let n = start; n <= end; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = pageText(groupLines(content.items as TextItem[]));
      if (text.length < MIN_CHARS_PER_PAGE) {
        warnings.push(`الصفحة ${n} لا تحتوي نصاً قابلاً للاستخراج (غالباً صورة ممسوحة ضوئياً). تحتاج إلى OCR أو إلى نسخ نصها يدوياً.`);
      } else if (/[ﭐ-﷿ﹰ-﻿]/.test(text)) {
        warnings.push(`الصفحة ${n}: ترميز الخط غير قياسي، راجع النص المستخرج وصحّحه قبل الحفظ.`);
      }
      pages.push({ page: n, text });
    }
    return { totalPages: pdf.numPages, pages, warnings };
  } finally {
    await pdf.loadingTask.destroy();
  }
}

/** نص بعلامات الصفحات: [صفحة N] ثم محتواها — يستعملها المولّد لتسجيل مرجع الصفحة الحقيقي */
export function joinPages(pages: { page: number; text: string }[]): string {
  return pages.filter(p => p.text).map(p => `${PAGE_MARKER(p.page)}\n${p.text}`).join('\n\n');
}
