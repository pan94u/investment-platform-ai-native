import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synapse - 投资管理 AI 平台',
  description: '基于 MCP 的 AI 原生投资管理平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
