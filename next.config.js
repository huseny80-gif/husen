/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // الواجهة الرئيسية للمنصة: الصفوف ← المكتبة ← الاختبارات ← سجل التقدم ← دخول المدرب
    return [{ source: '/', destination: '/platform.html', permanent: false }];
  },
};

module.exports = nextConfig;
