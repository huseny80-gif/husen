import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractPdfPages, joinPages } from '@/lib/pdf-text';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BODY_CHARS = 40000; // حد عمود body في learning_sources
// الملفات الأصغر من هذا الحد تُنزَّل بطلب واحد (أسرع وأبسط)؛ الأكبر (ملفات المكتبة الضخمة) تُقرأ صفحاتها المطلوبة فقط بطلبات Range
const FULL_DOWNLOAD_LIMIT = Number(process.env.PDF_FULL_DOWNLOAD_MB ?? 40) * 1024 * 1024;

// ملفات PDF غير الخطّية قد تُقرأ كاملة حتى في وضع Range، فنضع سقفاً ومهلة بدل انتظار طويل ينتهي بفشل
const MAX_REMOTE_BYTES = 200 * 1024 * 1024;
const EXTRACT_TIMEOUT_MS = 50_000;

async function remoteSize(url: string): Promise<number> {
  const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
  const total = res.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
  await res.body?.cancel();
  return total ? Number(total) : Number(res.headers.get('content-length') ?? 0);
}

// استخراج نص صفحات من PDF (مكتبة المادة أو ملف PDF مرفوع للفصل) — بدون أي خدمة خارجية.
// الصلاحيات تُفرض بحساب المستخدم نفسه (RLS) وبفحص مدرب المادة.
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return NextResponse.json({ error: 'سجّل الدخول أولًا.' }, { status: 401 });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'انتهت جلسة الدخول.' }, { status: 401 });

    const { kind, id, start, end } = await req.json();
    if (!['library', 'source'].includes(kind) || typeof id !== 'string' || !Number.isInteger(start) || !Number.isInteger(end)) {
      return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
    }

    let bucket: string, path: string, title: string, courseId: string;
    if (kind === 'library') {
      const { data: row } = await db.from('course_library').select('title,storage_path,course_id').eq('id', id).single();
      if (!row) return NextResponse.json({ error: 'الملف غير متاح لحسابك.' }, { status: 403 });
      ({ title, course_id: courseId, storage_path: path } = row);
      bucket = 'course-library';
    } else {
      const { data: row } = await db.from('learning_sources').select('title,storage_path,chapter_id').eq('id', id).single();
      if (!row) return NextResponse.json({ error: 'المصدر غير متاح لحسابك.' }, { status: 403 });
      if (!row.storage_path) return NextResponse.json({ error: 'هذا المصدر نصي أصلًا ولا يحتاج استخراجًا.' }, { status: 400 });
      const { data: chapter } = await db.from('chapters').select('course_id').eq('id', row.chapter_id).single();
      if (!chapter) return NextResponse.json({ error: 'الفصل غير متاح.' }, { status: 403 });
      ({ title, storage_path: path } = row);
      courseId = chapter.course_id;
      bucket = 'learning-sources';
    }

    const { data: allowed } = await db.rpc('is_instructor_for_course', { course_uuid: courseId });
    const { data: admin } = await db.rpc('is_admin');
    if (!allowed && !admin) return NextResponse.json({ error: 'الاستخراج متاح لمدرب المادة فقط.' }, { status: 403 });

    const { data: signed, error: signError } = await db.storage.from(bucket).createSignedUrl(path, 300);
    if (signError || !signed) return NextResponse.json({ error: 'تعذر الوصول إلى الملف في التخزين.' }, { status: 404 });

    let result;
    try {
      const size = await remoteSize(signed.signedUrl);
      if (size > MAX_REMOTE_BYTES) {
        return NextResponse.json({
          error: 'الملف كبير جدًا للاستخراج المباشر. ارفع الفصل المطلوب فقط كملف PDF في «ملفات الفصل» (حتى 25 ميغابايت) ثم استخرج منه.',
        }, { status: 413 });
      }
      const run = async () => {
        if (size > 0 && size <= FULL_DOWNLOAD_LIMIT) {
          const file = await fetch(signed.signedUrl);
          if (!file.ok) throw new Error('download');
          return extractPdfPages(new Uint8Array(await file.arrayBuffer()), start, end);
        }
        return extractPdfPages({ url: signed.signedUrl }, start, end);
      };
      result = await Promise.race([
        run(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاستخراج. اختر صفحات أقل أو ارفع الفصل كملف أصغر في «ملفات الفصل».')), EXTRACT_TIMEOUT_MS)),
      ]);
    } catch (e) {
      const known = e instanceof Error && /صفحة|نطاق|مهلة/.test(e.message);
      return NextResponse.json(
        { error: known ? (e as Error).message : 'تعذرت قراءة ملف PDF (قد يكون محميًا بكلمة مرور أو تالفًا).' },
        { status: 400 },
      );
    }

    let text = joinPages(result.pages);
    const warnings = [...result.warnings];
    if (text.length > MAX_BODY_CHARS) {
      text = text.slice(0, MAX_BODY_CHARS);
      warnings.push('النص طويل فاقتُطع عند 40000 حرف؛ اختر صفحات أقل لتغطية الباقي.');
    }
    return NextResponse.json({ title, total_pages: result.totalPages, text, warnings });
  } catch {
    return NextResponse.json({ error: 'تعذر استخراج النص.' }, { status: 400 });
  }
}
