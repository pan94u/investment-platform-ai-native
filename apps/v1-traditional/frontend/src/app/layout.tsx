import type { Metadata } from 'next';
import { IAMProvider } from '@/components/iam-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'V1 - 传统备案系统',
  description: '投资项目备案管理系统（传统版）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body
        className="min-h-screen bg-[#FAFAF9] text-gray-900 antialiased"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontFeatureSettings: "'cv11', 'ss01'" }}
      >
        <IAMProvider>{children}</IAMProvider>
      </body>
    </html>
  );
}
