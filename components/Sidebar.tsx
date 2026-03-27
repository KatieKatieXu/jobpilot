'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const inputItems = [
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/resume', label: 'Resume', icon: '📄' },
  { href: '/stories', label: 'Stories', icon: '📖' },
];

const mainItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/market', label: 'Market', icon: '📈' },
  { href: '/jobs', label: 'Jobs', icon: '💼' },
  { href: '/applications', label: 'Applications', icon: '📋' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold text-white">Jobpilot</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-4">
        {/* Dashboard at top */}
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-sm font-medium ${
            pathname === '/dashboard'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span className="text-base">📊</span>
          Dashboard
        </Link>
        
        {/* Input panel */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1">Input</p>
          <div className="space-y-0.5">
            {inputItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        
        {/* Other nav items */}
        <div className="space-y-1">
          {mainItems.filter(item => item.href !== '/dashboard').map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-sm font-medium ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">Powered by Cleo 🦾</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">✈️</span>
          <span className="text-lg font-bold text-white">Jobpilot</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar — unchanged */}
      <aside className="hidden md:flex w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex-col fixed left-0 top-0 z-50">
        {navContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar panel */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
