'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';

const strengths = [
  { label: 'Cognitive Science Background', score: 95 },
  { label: 'AI Product Experience', score: 90 },
  { label: 'Design Systems Expertise', score: 85 },
  { label: 'Solo Builder / Technical UX', score: 88 },
];

const gaps = [
  { label: 'Enterprise Scale Experience', score: 45 },
  { label: 'B2B Product Design', score: 55 },
  { label: 'Mobile-first Design Portfolio', score: 60 },
];

type ActionStatus = 'pending' | 'approved' | 'skipped';
const defaultActions: { id: number; text: string; status: ActionStatus }[] = [
  { id: 1, text: 'Add 2 AI-focused case studies to portfolio', status: 'pending' },
  { id: 2, text: 'Update LinkedIn headline to include "AI UX"', status: 'pending' },
  { id: 3, text: 'Request 3 LinkedIn recommendations', status: 'pending' },
  { id: 4, text: 'Add GitHub to profile for technical credibility', status: 'pending' },
  { id: 5, text: 'Write a post about your AI design workflow', status: 'pending' },
];

const profileQuestions = [
  {
    id: 1,
    question: 'What is your proudest design achievement in the last 2 years?',
    placeholder: 'Describe a project where your design had measurable impact...',
  },
  {
    id: 2,
    question: 'How do you approach designing for AI/ML products?',
    placeholder: 'Describe your framework or process...',
  },
  {
    id: 3,
    question: "What's your vision for the future of UX in an AI-first world?",
    placeholder: 'Share your perspective...',
  },
];

export default function MarketPage() {
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<{ id: number; text: string; status: ActionStatus }[]>(defaultActions);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const runAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAnalyzed(true);
    }, 1500);
  };

  const setActionStatus = (id: number, status: 'approved' | 'skipped') => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const pendingCount = actions.filter((a) => a.status === 'pending').length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Market Analysis</h1>
            <p className="text-slate-400 mt-1">Understand your positioning vs. the current market.</p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span> Analyzing...
              </>
            ) : (
              <>📊 Run Analysis</>
            )}
          </button>
        </div>

        {/* Status banner */}
        {analyzed && pendingCount > 0 && (
          <div className="bg-violet-900/30 border border-violet-700/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-violet-400">⚡</span>
            <p className="text-sm text-violet-300">
              <span className="font-semibold">{pendingCount} recommendations</span> pending your review.
            </p>
          </div>
        )}

        {!analyzed && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No analysis yet</h3>
            <p className="text-slate-500 text-sm">Run an analysis to see how you position in the current market.</p>
          </div>
        )}

        {analyzed && (
          <>
            {/* Your Positioning */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Your Positioning</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <span>✅</span> Strengths vs. Market
                  </h3>
                  <div className="space-y-3">
                    {strengths.map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{s.label}</span>
                          <span className="text-green-400">{s.score}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <span>⚠️</span> Gaps to Address
                  </h3>
                  <div className="space-y-3">
                    {gaps.map((g) => (
                      <div key={g.label}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{g.label}</span>
                          <span className="text-yellow-400">{g.score}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{ width: `${g.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Recommended Actions</h2>
              <div className="space-y-3">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                      action.status === 'approved'
                        ? 'bg-green-900/20 border-green-800/50'
                        : action.status === 'skipped'
                        ? 'bg-slate-800/50 border-slate-700/50 opacity-50'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <span className={`text-lg ${action.status === 'approved' ? 'text-green-400' : action.status === 'skipped' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {action.status === 'approved' ? '✅' : action.status === 'skipped' ? '⏭' : '○'}
                    </span>
                    <span className={`flex-1 text-sm ${action.status === 'skipped' ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {action.text}
                    </span>
                    {action.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActionStatus(action.id, 'approved')}
                          className="p-1.5 rounded-lg bg-green-900/40 hover:bg-green-900/60 text-green-400 transition text-xs font-semibold"
                          title="Approve"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setActionStatus(action.id, 'skipped')}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 transition text-xs font-semibold"
                          title="Skip"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Questions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Profile Questions</h2>
              <p className="text-slate-500 text-sm mb-6">Answer these to strengthen your profile narrative.</p>
              <div className="space-y-5">
                {profileQuestions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {q.id}. {q.question}
                    </label>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition text-sm resize-none h-24"
                      placeholder={q.placeholder}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                ))}
                <button className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition">
                  Save Answers
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
