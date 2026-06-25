'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const WELCOME_KEY = 'jobpilot_welcome_seen';

const steps = [
  {
    icon: '👤',
    title: 'Build Your Profile',
    desc: 'Tell us about your experience, skills, and career goals.',
  },
  {
    icon: '📄',
    title: 'Revise Your Resume',
    desc: 'Upload your resume for AI-powered analysis and optimization.',
  },
  {
    icon: '📖',
    title: 'Prepare Your Stories',
    desc: 'Build a STAR-format story bank for interview prep.',
  },
  {
    icon: '📈',
    title: 'Research Your Market',
    desc: 'Get AI insights on your positioning and target roles.',
  },
  {
    icon: '📋',
    title: 'Track Applications',
    desc: 'Manage your pipeline from applied to offer.',
  },
];

export default function WelcomeModal() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on first visit
    if (!localStorage.getItem(WELCOME_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(WELCOME_KEY, '1');
    setShow(false);
  };

  const getStarted = () => {
    localStorage.setItem(WELCOME_KEY, '1');
    setShow(false);
    router.push('/profile');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-8 shadow-2xl shadow-violet-500/10">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">✈️</div>
          <h2 className="text-2xl font-bold text-white">Welcome to Jobpilot</h2>
          <p className="text-slate-400 text-sm mt-2">
            Your AI-powered career toolkit. Let&apos;s set you up for success.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-base shrink-0">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  <span className="text-violet-400 mr-1.5">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={getStarted}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition text-sm"
        >
          Get Started — Set Up Your Profile
        </button>
        <button
          onClick={dismiss}
          className="w-full py-2 mt-2 text-slate-500 hover:text-slate-300 text-xs transition"
        >
          Skip for now — I&apos;ll explore on my own
        </button>
      </div>
    </div>
  );
}
