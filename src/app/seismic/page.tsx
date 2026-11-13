'use client';

import dynamic from 'next/dynamic';
import SeismicDashboard from '@/components/seismic/SeismicDashboard';

// WebGL يعمل في المتصفح فقط، لذا يُحمَّل المشهد بدون SSR
const SeismicOfficeScene = dynamic(() => import('@/components/seismic/SeismicOfficeScene'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 550, background: '#001A17', borderRadius: 12, display: 'grid', placeItems: 'center', color: '#B2DFDB' }}>
      جارٍ تحميل المشهد ثلاثي الأبعاد...
    </div>
  ),
});

export default function SeismicPage() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
      <SeismicOfficeScene />
      <SeismicDashboard />
    </main>
  );
}
