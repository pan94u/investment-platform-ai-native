import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '投资备案 AI 原生版',
  description: '投资项目备案管理系统（AI 原生版）',
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
