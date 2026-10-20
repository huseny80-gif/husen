# مهمة مراجعة لـ Codex — الطلب #3

المستودع: huseny80-gif/husen — الفرع: `feature/performance-analytics` (مقابل `main`)

## المطلوب
راجع التغييرات فقط (قراءة فقط، دون تعديل) وابحث عن أخطاء حقيقية:

    git diff origin/main...feature/performance-analytics -- public/analytics.js public/performance.html public/catalog.js public/nav.js public/progress.html public/studio.html public/quizzes

## ما أُضيف
- `public/analytics.js`: سجل المحاولات في LocalStorage (`perf-history-v1`)، تجميع حسب المادة والكورس والشهر، مخطط Canvas (أعمدة/خطوط) مع tooltip، وأشرطة تقدّم متحركة.
- `public/performance.html`: لوحة التحليلات حسب الصف (4/5/6).
- صفحات الاختبارات و`studio.html`: تسجيل المحاولة وعرض أشرطة النتيجة الفورية.
- `catalog.js`: حقلا `sub` و`u` لكل اختبار.

## اركّز على
1. أخطاء JavaScript أو حالات null/undefined عند غياب LocalStorage أو بيانات تالفة.
2. تكرار تسجيل المحاولة نفسها (شاشة مراجعة الأخطاء تستدعي `finish()` ثانية).
3. صحة حساب الكورس والشهر (الأول: أكتوبر–يناير، الثاني: فبراير وما بعده) وحدود الأشهر.
4. أي خلل في الرسم على شاشات HiDPI أو الصفحات RTL، وتسرّب مستمعي الأحداث.
5. أي شيء قد يُفشل بناء Vercel (الملفات ثابتة داخل `public/` ولا تُبنى بـ webpack).

أعطِ النتيجة قائمةً مرتّبة بالأهمية مع الملف والسطر وسيناريو الفشل، ولا تُعدّل الملفات.
