import type { Metadata } from 'next';
import { AuthProvider } from '@/app/components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jobpilot — Find your dream job',
  description: 'AI-powered job search and application tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f1117] text-slate-100 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
