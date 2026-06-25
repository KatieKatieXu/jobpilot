'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getProfile, type Profile } from '@/app/lib/db';

const STORAGE_KEY = 'jobpilot_market_report';

interface MarketAnalysis {
  bestFitRoles: {
    title: string;
    reasoning: string;
  }[];
  targetCompanyTypes: {
    type: string;
    whyYouWin: string;
  }[];
  marketFitScore: number;
  linkedinAdvice: {
    id: string;
    text: string;
    priority: 'high' | 'medium' | 'low';
    status?: 'pending' | 'done' | 'skipped';
  }[];
  experienceQuestions: {
    id: string;
    question: string;
    placeholder: string;
    purpose: string;
  }[];
}

interface MarketReport {
  analysis: MarketAnalysis;
  answers: Record<string, string>;
  savedAt: string;
  profileHash: string;
}

// Simple hash to detect major profile changes
function hashProfile(profile: Record<string, unknown>): string {
  const keyFields = [
    profile.currentTitle,
    profile.topSkills,
    profile.workExperience,
    profile.targetRoles,
    profile.differentiation,
  ];
  return JSON.stringify(keyFields);
}

export default function MarketPage() {
  const supabase = useSupabase();
  const [hasReport, setHasReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);
  const [profileData, setProfileData] = useState<Profile | null>(null);

  // Load profile + saved report on mount
  useEffect(() => {
    (async () => {
      // Load profile from Supabase (auth'd) or localStorage (anonymous)
      const profile = await getProfile(supabase);
      setProfileData(profile);

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const report: MarketReport = JSON.parse(raw);
          setAnalysis(report.analysis);
          setSavedAt(report.savedAt);
          setHasReport(true);

          // Check if profile changed since last analysis
          if (profile) {
            const currentHash = hashProfile(profile as unknown as Record<string, unknown>);
            if (report.profileHash && report.profileHash !== currentHash) {
              setProfileChanged(true);
            }
          }
        } catch {}
      }
    })();
  }, [supabase]);

  const persist = (updatedAnalysis: MarketAnalysis, profile?: Profile | null) => {
    const p = profile ?? profileData;
    let ph = '';
    if (p) {
      try {
        ph = hashProfile(p as unknown as Record<string, unknown>);
      } catch {}
    }

    const report: MarketReport = {
      analysis: updatedAnalysis,
      answers: {},
      savedAt: new Date().toISOString(),
      profileHash: ph,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    setSavedAt(report.savedAt);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch fresh profile from Supabase (auth'd) or localStorage (anonymous)
      const profile = await getProfile(supabase);
      if (!profile) {
        throw new Error('No profile found. Please complete your profile first.');
      }
      setProfileData(profile);

      const res = await fetch('/api/analyze-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze');
      }

      const data = await res.json();
      const newAnalysis: MarketAnalysis = {
        ...data.analysis,
        linkedinAdvice: data.analysis.linkedinAdvice.map((a: MarketAnalysis['linkedinAdvice'][0]) => ({
          ...a,
          status: 'pending' as const,
        })),
      };

      // persist uses the local `profile` variable directly so it works
      // even if the component unmounts while the fetch was in-flight
      setAnalysis(newAnalysis);
      setHasReport(true);
      setProfileChanged(false);
      persist(newAnalysis, profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearReport = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasReport(false);
    setAnalysis(null);
    setSavedAt(null);
    setShowClearConfirm(false);
    setProfileChanged(false);
  };

  const setAdviceStatus = (id: string, status: 'done' | 'skipped') => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      linkedinAdvice: analysis.linkedinAdvice.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    };
    setAnalysis(updated);
    persist(updated);
  };

  // Calculate LinkedIn advice visibility
  const showLinkedinSection = analysis && analysis.marketFitScore < 80;
  const pendingAdvice = analysis?.linkedinAdvice.filter((a) => a.status === 'pending') || [];
  const completedAdvice = analysis?.linkedinAdvice.filter((a) => a.status === 'done') || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Market Analysis</h1>
            <p className="text-slate-400 mt-1">Understand your positioning and what makes you stand out.</p>
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

        {/* Profile changed banner */}
        {profileChanged && (
          <div className="flex items-center justify-between bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-yellow-400">⚠️</span>
              <p className="text-sm text-yellow-300">
                Your profile has changed since the last analysis. Consider re-running for updated insights.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-5 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!hasReport && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No analysis yet</h3>
            <p className="text-slate-500 text-sm">Run an analysis to discover your best-fit roles and how to position yourself.</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4 animate-pulse">📊</div>
            <p className="text-slate-300 font-medium">Analyzing your market position…</p>
            <p className="text-slate-500 text-sm mt-2">This may take 10-15 seconds</p>
            <p className="text-slate-600 text-xs mt-4">Feel free to switch tabs — your results will be saved automatically.</p>
          </div>
        )}

        {hasReport && analysis && !loading && (
          <>
            {/* Market Fit Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Market Fit Score</h2>
                <div className={`text-3xl font-bold ${
                  analysis.marketFitScore >= 80 ? 'text-green-400' :
                  analysis.marketFitScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {analysis.marketFitScore}
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    analysis.marketFitScore >= 80 ? 'bg-green-500' :
                    analysis.marketFitScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${analysis.marketFitScore}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {analysis.marketFitScore >= 80 
                  ? 'Excellent positioning — you stand out in your target market'
                  : analysis.marketFitScore >= 60
                  ? 'Good foundation — some optimizations will strengthen your position'
                  : 'Room for improvement — follow the recommendations below'}
              </p>
            </div>

            {/* Best-Fit Roles */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🎯 Your Best-Fit Roles</h2>
              <div className="space-y-4">
                {analysis.bestFitRoles.map((role, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-800/50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 font-bold text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{role.title}</h3>
                      <p className="text-slate-400 text-sm mt-1">{role.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Company Types */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🏢 Where You'll Win</h2>
              <div className="grid gap-4">
                {analysis.targetCompanyTypes.map((company, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 rounded-xl border-l-4 border-violet-500">
                    <h3 className="text-white font-semibold">{company.type}</h3>
                    <p className="text-slate-400 text-sm mt-2">{company.whyYouWin}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* LinkedIn Advice - only show if score < 80 */}
            {showLinkedinSection && pendingAdvice.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">💼 LinkedIn Optimization</h2>
                  <span className="text-xs text-slate-500">
                    {completedAdvice.length} of {analysis.linkedinAdvice.length} completed
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingAdvice.map((advice) => (
                    <div
                      key={advice.id}
                      className="flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl"
                    >
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        advice.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        advice.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {advice.priority}
                      </span>
                      <span className="flex-1 text-sm text-slate-300">{advice.text}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAdviceStatus(advice.id, 'done')}
                          className="p-1.5 rounded-lg bg-green-900/40 hover:bg-green-900/60 text-green-400 transition text-xs font-semibold"
                          title="Mark done"
                        >✓</button>
                        <button
                          onClick={() => setAdviceStatus(advice.id, 'skipped')}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 transition text-xs font-semibold"
                          title="Skip"
                        >✗</button>
                      </div>
                    </div>
                  ))}
                </div>
                {completedAdvice.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                      View {completedAdvice.length} completed item{completedAdvice.length > 1 ? 's' : ''}
                    </summary>
                    <div className="space-y-2 mt-3">
                      {completedAdvice.map((advice) => (
                        <div
                          key={advice.id}
                          className="flex items-center gap-3 p-3 bg-green-900/10 border border-green-800/30 rounded-lg opacity-70"
                        >
                          <span className="text-green-400">✓</span>
                          <span className="flex-1 text-sm text-slate-400 line-through">{advice.text}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Score >= 80 but has completed LinkedIn advice */}
            {analysis.marketFitScore >= 80 && completedAdvice.length > 0 && (
              <div className="bg-green-900/10 border border-green-800/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-green-400 text-xl">✨</span>
                  <h2 className="text-lg font-semibold text-green-300">LinkedIn Optimized</h2>
                </div>
                <p className="text-sm text-slate-400">
                  You've completed {completedAdvice.length} improvement{completedAdvice.length > 1 ? 's' : ''}. 
                  Your score is {analysis.marketFitScore}% — no further LinkedIn optimization needed.
                </p>
              </div>
            )}

            {/* Experience Deep-Dive — Link to Stories */}
            {analysis.experienceQuestions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1">📖 Experience Deep-Dive</h2>
                    <p className="text-slate-500 text-sm">
                      {analysis.experienceQuestions.length} AI-generated questions based on your profile.
                      Answer them to power better cover letters and interview prep.
                    </p>
                  </div>
                  <a
                    href="/stories"
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition shrink-0"
                  >
                    Answer in Stories →
                  </a>
                </div>
              </div>
            )}

            {/* Last updated */}
            {savedAt && (
              <p className="text-center text-xs text-slate-500">
                Last analyzed {new Date(savedAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
