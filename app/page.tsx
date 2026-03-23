'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [hasProfile, setHasProfile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setHasProfile(!!localStorage.getItem('jobpilot_profile'));
    setChecked(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-5xl">✈️</span>
          <h1 className="text-4xl font-bold text-white tracking-tight">Jobpilot</h1>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl font-semibold text-slate-100 mb-4 leading-tight">
          Find your dream job.
          <br />
          <span className="text-violet-400">We do the heavy lifting.</span>
        </h2>
        <p className="text-slate-400 text-lg mb-10">
          Smart job matching, application tracking, and market analysis — all in one place.
        </p>

        {/* CTA */}
        {checked && (
          <div className="flex flex-col items-center gap-3">
            <Link
              href={hasProfile ? '/dashboard' : '/profile'}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-150 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
              {hasProfile ? 'Go to Dashboard →' : 'Get Started →'}
            </Link>
            {hasProfile && (
              <Link
                href="/profile"
                className="text-sm text-slate-500 hover:text-violet-400 transition"
              >
                New? Set up your profile →
              </Link>
            )}
          </div>
        )}

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: '🎯', title: 'Smart Matching', desc: 'AI-curated jobs that fit your profile' },
            { icon: '📊', title: 'Market Intel', desc: 'Know your positioning vs. the market' },
            { icon: '🚀', title: 'Auto-Apply', desc: 'Pre-filled forms, one-click apply' },
          ].map((f) => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-sm font-semibold text-slate-200 mb-1">{f.title}</div>
              <div className="text-xs text-slate-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
