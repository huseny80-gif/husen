import { redirect } from 'next/navigation';

// الواجهة الرئيسية للمنصة هي /platform.html (الصفوف ← المكتبة ← الاختبارات)،
// ومنها يُدخل إلى لوحة المدرب وسجل التقدم.
export default function HomePage() {
  redirect('/platform.html');
}
