import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Document Intelligence & Agentic RAG Platform',
  description: 'Enterprise-grade secure document processing with intelligent RAG capabilities',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
