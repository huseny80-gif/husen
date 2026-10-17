import type { Metadata } from 'next';
import './globals.css';
import { HomeNavigation } from '@/components/navigation/HomeNavigation';

export const metadata: Metadata = {
  title: 'المنصة التعليمية - المرحلة الإعدادية',
  description: 'منصة تعليمية متكاملة للمرحلة الإعدادية (الرابع - الخامس - السادس)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-arabic antialiased">
        <HomeNavigation />
        {children}
      </body>
    </html>
  );
}
