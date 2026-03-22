'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

const STORAGE_KEY = 'jobpilot_market_report';

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

const defaultActions = [
  { id: 1, text: 'Add 2 AI-focused case studies to portfolio', status: 'pending' as ActionStatus },
  { id: 2, text: 'Update LinkedIn headline to include "AI UX"', status: 'pending' as ActionStatus },
  { id: 3, text: 'Request 3 LinkedIn recommendations', status: 'pending' as ActionStatus },
  { id: 4, text: 'Add GitHub to profile for technical credibility', status: 'pending' as ActionStatus },
  { id: 5, text: 'Write a post about your AI design workflow', status: 'pending' as ActionStatus },
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

type ActionStatus = 'pending' | 'approved' | 'skipped';

interface MarketReport {
  actions: { id: number; text: string; status: ActionStatus }[];
  answers: Record<number, string>;
  savedAt: string;
}

export default function MarketPage() {
  const [hasReport, setHasReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<{ id: number; text: string; status: ActionStatus }[]>(defaultActions);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load saved report on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const report: MarketReport = JSON.parse(raw);
        setActions(report.actions);
        setAnswers(report.answers || {});
        setSavedAt(report.savedAt);
        setHasReport(true);
      } catch {}
    }
  }, []);

  const persist = (
    updatedActions: typeof actions,
    updatedAnswers: Record<number, string>
  ) => {
    const report: MarketReport = {
      actions: updatedActions,
      answers: updatedAnswers,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    setSavedAt(report.savedAt);
  };

  const runAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const fresh = defaultActions.map((a) => ({ ...a, status: 'pending' as ActionStatus }));
      setActions(fresh);
      setAnswers({});
      setHasReport(true);
      persist(fresh, {});
    }, 1500);
  };

  const clearReport = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasReport(false);
    setActions(defaultActions.map((a) => ({ ...a, status: 'pending' as ActionStatus })));
    setAnswers({});
    setSavedAt(null);
    setShowClearConfirm(false);
  };

  const setActionStatus = (id: number, status: 'approved' | 'skipped') => {
    setActions((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status } : a));
      persist(next, answers);
      return next;
    });
  };

  const saveAnswers = () => {
    persist(actions, answers);
  };

  const updateAnswer = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const pendingCount = actions.filter((a) => a.status === 'pending').length;
  const approvedCount = actions.filter((a) => a.status === 'approved').length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Market Analysis</h1>
            <p className="text-slate-400 mt-1">Understand your positioning vs. the current market.</p>
          </div>
          <div className="flex items-center gap-3">
            {hasReport && (
              <>
                {showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Clear this report?</span>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                    >Cancel</button>
                    <button
                      onClick={clearReport}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition"
                    >Yes, clear</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-sm rounded-lg transition"
                  >
                    🗑 Clear
                  </button>
                )}
              </>
            )}
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span> Analyzing...
                </>
              ) : hasReport ? (
                <>🔄 Re-run Analysis</>
              ) : (
                <>📊 Run Analysis</>
              )}
            </button>
          </div>
        </div>

        {/* Status banner */}
        {hasReport && (
          <div className="flex items-center justify-between bg-violet-900/20 border border-violet-700/40 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-violet-400">📊</span>
              <p className="text-sm text-violet-300">
                <span className="font-semibold">{approvedCount} actions approved</span>
                {pendingCount > 0 && <span className="text-violet-400"> · {pendingCount} still pending</span>}
              </p>
            </div>
            {savedAt && (
              <p className="text-xs text-slate-500">
                Last updated {new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasReport && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No analysis yet</h3>
            <p className="text-slate-500 text-sm">Run an analysis to see how you position in the current market.</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4 animate-pulse">📊</div>
            <p className="text-slate-300 font-medium">Analyzing your market position…</p>
          </div>
        )}

        {hasReport && !loading && (
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
                    {action.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActionStatus(action.id, 'approved')}
                          className="p-1.5 rounded-lg bg-green-900/40 hover:bg-green-900/60 text-green-400 transition text-xs font-semibold"
                          title="Approve"
                        >✓</button>
                        <button
                          onClick={() => setActionStatus(action.id, 'skipped')}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 transition text-xs font-semibold"
                          title="Skip"
                        >✗</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActionStatus(action.id, action.status === 'approved' ? 'skipped' : 'approved')}
                        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Questions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Profile Questions</h2>
              <p className="text-slate-500 text-sm mb-6">Answer these to strengthen your profile narrative. Answers are saved automatically.</p>
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
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                    />
                  </div>
                ))}
                <button
                  onClick={saveAnswers}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition"
                >
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
