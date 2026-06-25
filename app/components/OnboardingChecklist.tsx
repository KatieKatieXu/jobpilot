'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DISMISSED_KEY = 'jobpilot_onboarding_dismissed';

interface ChecklistProps {
  hasProfile: boolean;
  hasResume: boolean;
  hasStories: boolean;
  hasMarket: boolean;
  hasApplications: boolean;
}

interface Step {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: string;
  doneIcon: string;
  done: boolean;
}

export default function OnboardingChecklist({
  hasProfile,
  hasResume,
  hasStories,
  hasMarket,
  hasApplications,
}: ChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  const steps: Step[] = [
    {
      id: 'profile',
      label: 'Set up your profile',
      desc: 'Add your experience, skills, and career goals',
      href: '/profile',
      icon: '👤',
      doneIcon: '✅',
      done: hasProfile,
    },
    {
      id: 'resume',
      label: 'Upload your resume',
      desc: 'Get AI-powered resume analysis',
      href: '/resume',
      icon: '📄',
      doneIcon: '✅',
      done: hasResume,
    },
    {
      id: 'stories',
      label: 'Add your first story',
      desc: 'Build STAR-format stories for interviews',
      href: '/stories',
      icon: '📖',
      doneIcon: '✅',
      done: hasStories,
    },
    {
      id: 'market',
      label: 'Run market analysis',
      desc: 'Understand your positioning and opportunities',
      href: '/market',
      icon: '📈',
      doneIcon: '✅',
      done: hasMarket,
    },
    {
      id: 'applications',
      label: 'Track an application',
      desc: 'Add a job you\'ve applied to',
      href: '/applications',
      icon: '📋',
      doneIcon: '✅',
      done: hasApplications,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completed === total;

  // Don't show if dismissed or all steps complete
  if (dismissed || allDone) return null;

  const progress = Math.round((completed / total) * 100);

  // Find the next uncompleted step
  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Getting Started</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {completed} of {total} steps complete
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, '1');
            setDismissed(true);
          }}
          className="text-xs text-slate-600 hover:text-slate-400 transition"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`flex items-center gap-3 p-3 rounded-xl transition group ${
              step.done
                ? 'bg-slate-800/30'
                : step === nextStep
                ? 'bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20'
                : 'bg-slate-800/30 hover:bg-slate-800/60'
            }`}
          >
            {/* Status icon */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                step.done
                  ? 'bg-green-500/20 text-green-400'
                  : step === nextStep
                  ? 'bg-violet-600/30 border border-violet-500/40 text-violet-300'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {step.done ? '✓' : step.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.done
                    ? 'text-slate-500 line-through'
                    : step === nextStep
                    ? 'text-white'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </p>
              {!step.done && step === nextStep && (
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
              )}
            </div>

            {/* Arrow for next step */}
            {!step.done && step === nextStep && (
              <span className="text-violet-400 text-sm group-hover:translate-x-0.5 transition-transform">→</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
