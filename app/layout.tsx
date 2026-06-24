import type { Metadata } from 'next';
import { AuthProvider } from '@/app/components/AuthProvider';
import { ThemeProvider } from '@/app/components/ThemeProvider';
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
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
