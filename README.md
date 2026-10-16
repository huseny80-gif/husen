# 🎓 المنصة التعليمية للمرحلة الإعدادية

منصة تعليمية وتدريبية متكاملة للمراحل: **الرابع - الخامس - السادس الإعدادي**

---

## ✨ المميزات

| الميزة | الوصف |
|--------|-------|
| 🗃️ قاعدة بيانات آمنة | Supabase/PostgreSQL مع RLS وسياسات صلاحيات كاملة |
| 👨‍🏫 لوحة تحكم المدرب | يرى المدرب فقط موادّه المكلف بها |
| 📝 اختبارات تفاعلية | أسئلة اختيار متعدد مع عداد تقدم وتصحيح فوري |
| 💡 تفسير علمي | شرح سبب الخطأ لكل سؤال مع الإجابة الصحيحة |
| 📊 سجل التقدم | إحصائيات الطالب عبر الزمن مع رسم بياني |
| 🔒 RBAC | صلاحيات محكمة: admin / instructor / student |

---

## 🏗️ هيكل المشروع

```
educational-platform/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   ← كامل سكربت SQL
│   └── seed.sql                     ← بيانات تجريبية
├── src/
│   ├── app/
│   │   ├── page.tsx                 ← الصفحة الرئيسية
│   │   ├── login/page.tsx           ← تسجيل الدخول
│   │   ├── instructor/
│   │   │   └── dashboard/page.tsx  ← لوحة تحكم المدرب
│   │   ├── student/
│   │   │   ├── quiz/[quizId]/page.tsx  ← الاختبار
│   │   │   └── progress/page.tsx       ← سجل التقدم
│   │   └── api/quiz/submit/route.ts    ← API الإرسال
│   ├── components/
│   │   ├── instructor/
│   │   │   ├── InstructorDashboard.tsx
│   │   │   └── ChapterManager.tsx
│   │   ├── student/
│   │   │   ├── QuizView.tsx
│   │   │   └── ProgressDashboard.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Badge.tsx
│   └── lib/
│       ├── types.ts
│       ├── supabase.ts
│       └── supabase-server.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 خطوات التثبيت والتشغيل

### الخطوة 1: إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً
2. اختر اسم المشروع وكلمة مرور قوية لقاعدة البيانات
3. انتظر حتى يكتمل الإعداد (~2 دقيقة)

### الخطوة 2: تشغيل سكربت SQL

في **Supabase Dashboard → SQL Editor**، انسخ محتوى الملف:
```
supabase/migrations/001_initial_schema.sql
```
والصقه ثم اضغط **Run**.

ثم شغّل ملف البيانات التجريبية:
```
supabase/seed.sql
```

### الخطوة 3: الحصول على مفاتيح API

في **Supabase Dashboard → Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### الخطوة 4: إعداد متغيرات البيئة

```bash
cp .env.local.example .env.local
```

عدّل `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### الخطوة 5: تثبيت المكتبات وتشغيل المشروع

```bash
npm install
npm run dev
```

افتح المتصفح على: **http://localhost:3000**

---

## 👥 إنشاء المستخدمين

### إنشاء مدرب (Instructor)

في **Supabase Dashboard → Authentication → Users → Add User**:
```
Email: teacher@school.iq
Password: SecurePass123
```

ثم في **SQL Editor** لتعيين دور المدرب:
```sql
UPDATE public.profiles
SET role = 'instructor', full_name = 'أ. محمد الكريم'
WHERE id = 'USER_UUID_HERE';
```

### تكليف مدرب بمادة

```sql
INSERT INTO public.instructor_courses (instructor_id, course_id)
VALUES (
  'instructor-uuid-here',
  'course-uuid-here'
);
```

للحصول على course_id:
```sql
SELECT id, title, grade_id FROM public.courses;
```

### إنشاء طالب

```
Email: student@school.iq
Password: Student123
```
(الدور الافتراضي هو `student`)

---

## 📝 إضافة اختبار مع أسئلة (مثال)

```sql
-- أولاً: إضافة اختبار لفصل معين
INSERT INTO public.quizzes (chapter_id, title, description, time_limit_min, pass_score)
VALUES (
  'chapter-uuid-here',
  'اختبار الوحدة الأولى - المعادلات الخطية',
  'اختبار يغطي مفاهيم المعادلات الخطية',
  30,   -- 30 دقيقة
  60    -- 60% للنجاح
) RETURNING id;

-- ثانياً: إضافة سؤال
INSERT INTO public.questions (quiz_id, question_text, options, correct_answer, explanation, points, sort_order)
VALUES (
  'quiz-uuid-here',
  'ما قيمة x في المعادلة: 2x + 4 = 10 ؟',
  '[
    {"key":"A","text":"2"},
    {"key":"B","text":"3"},
    {"key":"C","text":"4"},
    {"key":"D","text":"5"}
  ]'::jsonb,
  'B',   -- الإجابة الصحيحة هي B
  'بطرح 4 من الطرفين: 2x = 6، ثم بالقسمة على 2: x = 3',
  2,     -- نقطتان
  1
);
```

---

## 🛡️ نموذج صلاحيات RBAC

| العملية | Admin | Instructor (للمادة المكلف بها) | Student |
|---------|-------|-------------------------------|---------|
| قراءة المواد | ✅ | ✅ | ✅ |
| تعديل المادة | ✅ | ✅ | ❌ |
| إضافة فصل | ✅ | ✅ | ❌ |
| إضافة سؤال | ✅ | ✅ | ❌ |
| حل اختبار | ✅ | ✅ | ✅ |
| عرض نتائج الكل | ✅ | ✅* | ❌ |
| تكليف مدرب | ✅ | ❌ | ❌ |

> *المدرب يرى نتائج طلاب مواده فقط

---

## 🔗 المسارات

| المسار | الوصف |
|--------|-------|
| `/` | الصفحة الرئيسية |
| `/login` | تسجيل الدخول |
| `/instructor/dashboard` | لوحة تحكم المدرب |
| `/student/quiz/[quizId]` | الاختبار التفاعلي |
| `/student/progress` | سجل تقدم الطالب |
| `/api/quiz/submit` | API إرسال الاختبار |

---

## 🛠️ التقنيات المستخدمة

- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS + Cairo Font
- **Database:** Supabase (PostgreSQL) + Row Level Security
- **Auth:** Supabase Auth
- **Icons:** Lucide React
