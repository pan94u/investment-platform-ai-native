import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'V1 - 传统备案系统',
  description: '投资项目备案管理系统（传统版）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
