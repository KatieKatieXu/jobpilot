'use client';

import { useState, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import type { Suggestion } from '../api/analyze-resume/route';

type Step = 'upload' | 'review' | 'export';
type Category = 'all' | 'impact' | 'ats' | 'clarity' | 'gaps' | 'formatting';

const CATEGORY_COLORS: Record<string, string> = {
  impact: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ats: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  clarity: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  gaps: 'bg-red-500/20 text-red-400 border-red-500/30',
  formatting: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-slate-600/40 text-slate-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  impact: '⚡ Impact',
  ats: '🎯 ATS',
  clarity: '✂️ Clarity',
  gaps: '🔍 Gaps',
  formatting: '📐 Format',
};

export default function ResumePage() {
  const [step, setStep] = useState<Step>('upload');
  const [resumeText, setResumeText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'skipped' | null>>({});
  const [filterCategory, setFilterCategory] = useState<Category>('all');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [revisedText, setRevisedText] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: file upload ──────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('resume', file);
      const res = await fetch('/api/parse-resume', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Parse failed');
      setResumeText(data.text);
      setPastedText(data.text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const analyzeResume = async () => {
    const text = pastedText.trim() || resumeText.trim();
    if (!text || text.length < 50) {
      setError('Please upload a PDF or paste your resume text first.');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');
      setSuggestions(data.suggestions);
      setDecisions(Object.fromEntries(data.suggestions.map((s: Suggestion) => [s.id, null])));
      setResumeText(text);
      setStep('review');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2: review ───────────────────────────────────────────────────────
  const decide = (id: string, decision: 'approved' | 'skipped') => {
    setDecisions((prev) => ({ ...prev, [id]: prev[id] === decision ? null : decision }));
  };

  const approveAll = () => {
    const filtered = filteredSuggestions;
    setDecisions((prev) => {
      const next = { ...prev };
      filtered.forEach((s) => { next[s.id] = 'approved'; });
      return next;
    });
  };

  const approvedSuggestions = suggestions.filter((s) => decisions[s.id] === 'approved');
  const filteredSuggestions = filterCategory === 'all'
    ? suggestions
    : suggestions.filter((s) => s.category === filterCategory);

  const applyChanges = async () => {
    if (approvedSuggestions.length === 0) return;
    setExporting(true);
    setError('');
    try {
      const res = await fetch('/api/export-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: resumeText, approvedSuggestions }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Export failed');
      setRevisedText(data.revisedText);
      setAppliedCount(data.appliedCount);
      setStep('export');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ── Step 3: export ───────────────────────────────────────────────────────
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(revisedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([revisedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revised-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncToProfile = () => {
    try {
      const saved = localStorage.getItem('jobpilot_profile');
      const profile = saved ? JSON.parse(saved) : {};
      profile.workExperience = revisedText;
      localStorage.setItem('jobpilot_profile', JSON.stringify(profile));
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    } catch {
      setError('Failed to sync to profile.');
    }
  };

  const startOver = () => {
    setStep('upload');
    setResumeText('');
    setPastedText('');
    setSuggestions([]);
    setDecisions({});
    setRevisedText('');
    setAppliedCount(0);
    setFileName('');
    setError('');
    setFilterCategory('all');
    setSynced(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Reviser</h1>
          <p className="text-slate-400">AI-powered resume analysis and optimization for senior design & AI roles.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['upload', 'review', 'export'] as Step[]).map((s, i) => {
            const labels = ['Upload', 'Review', 'Export'];
            const isActive = step === s;
            const isPast = (['upload', 'review', 'export'] as Step[]).indexOf(step) > i;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${isPast ? 'bg-violet-500' : 'bg-slate-700'}`} />}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  isActive ? 'bg-violet-600 text-white' : isPast ? 'bg-violet-600/30 text-violet-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-white/20' : isPast ? 'bg-violet-500/30' : 'bg-slate-700'
                  }`}>{i + 1}</span>
                  {labels[i]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1: UPLOAD ─────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              onClick={() => !loading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 hover:border-violet-500/60 hover:bg-slate-800/50'
              } ${loading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {loading ? (
                <>
                  <div className="text-4xl mb-3 animate-pulse">⏳</div>
                  <p className="text-slate-300 font-medium">Parsing {fileName}…</p>
                  <p className="text-slate-500 text-sm mt-1">Extracting your resume text</p>
                </>
              ) : resumeText ? (
                <>
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-emerald-400 font-medium">{fileName} — parsed!</p>
                  <p className="text-slate-500 text-sm mt-1">Click to replace · or edit the text below</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-slate-300 font-medium">Drop your resume PDF here</p>
                  <p className="text-slate-500 text-sm mt-1">or click to browse · PDF only</p>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-slate-500 text-sm">or paste text</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Paste textarea */}
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your resume text here…"
              rows={12}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none font-mono"
            />

            {/* Analyze button */}
            <button
              onClick={analyzeResume}
              disabled={analyzing || loading || (!pastedText.trim() && !resumeText)}
              className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Analyzing your resume with AI…
                </>
              ) : (
                <>
                  🔍 Analyze My Resume
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: REVIEW ─────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{suggestions.length} suggestions found</h2>
                <p className="text-slate-400 text-sm mt-0.5">{approvedSuggestions.length} approved · {suggestions.filter(s => decisions[s.id] === 'skipped').length} skipped</p>
              </div>
              <button
                onClick={approveAll}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 text-sm font-medium rounded-lg transition-all"
              >
                ✓ Approve All
              </button>
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([cat, label]) => {
                const count = cat === 'all' ? suggestions.length : suggestions.filter(s => s.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      filterCategory === cat
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {label} {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Suggestion cards */}
            <div className="space-y-4">
              {filteredSuggestions.map((s) => {
                const decision = decisions[s.id];
                return (
                  <div
                    key={s.id}
                    className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
                      decision === 'approved' ? 'border-emerald-500/40 bg-emerald-500/5' :
                      decision === 'skipped' ? 'border-slate-700/30 opacity-50' :
                      'border-slate-700'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border capitalize ${CATEGORY_COLORS[s.category]}`}>
                          {s.category}
                        </span>
                        <span className="text-slate-400 text-sm">{s.section}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize ${PRIORITY_COLORS[s.priority]}`}>
                          {s.priority}
                        </span>
                      </div>
                      {/* Approve / Skip buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => decide(s.id, 'skipped')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                            decision === 'skipped'
                              ? 'bg-red-500/30 text-red-400 border border-red-500/40'
                              : 'bg-slate-700 text-slate-400 hover:bg-red-500/20 hover:text-red-400 border border-transparent'
                          }`}
                          title="Skip"
                        >✗</button>
                        <button
                          onClick={() => decide(s.id, 'approved')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                            decision === 'approved'
                              ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-700 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 border border-transparent'
                          }`}
                          title="Approve"
                        >✓</button>
                      </div>
                    </div>

                    {/* Before / After diff */}
                    <div className="space-y-2 mb-3">
                      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1">Before</span>
                        <p className="text-slate-300 text-sm leading-relaxed">{s.original}</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                        <span className="text-xs text-emerald-400 font-medium uppercase tracking-wide block mb-1">After — edit freely ✏️</span>
                        <textarea
                          className="w-full bg-transparent text-emerald-300 text-sm leading-relaxed resize-none focus:outline-none placeholder-emerald-800"
                          rows={Math.max(2, s.revised.split('\n').length)}
                          value={decisions[s.id] === 'approved' || decisions[s.id] === null ? (s as Suggestion & { _edited?: string })._edited ?? s.revised : s.revised}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSuggestions((prev) =>
                              prev.map((item) =>
                                item.id === s.id ? { ...item, revised: val } : item
                              )
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="text-slate-500 text-xs leading-relaxed">💡 {s.reason}</p>
                  </div>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* CTA */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={applyChanges}
                disabled={approvedSuggestions.length === 0 || exporting}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <><span className="animate-spin">⟳</span> Applying changes…</>
                ) : (
                  `Apply ${approvedSuggestions.length} Approved Changes →`
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: EXPORT ─────────────────────────────────────────── */}
        {step === 'export' && (
          <div className="space-y-6">
            {/* Success header */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4">
              <div className="text-4xl">🎉</div>
              <div>
                <h2 className="text-xl font-bold text-white">{appliedCount} changes applied</h2>
                <p className="text-slate-400 text-sm mt-1">Your resume has been revised and optimized.</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
              >
                {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
              </button>
              <button
                onClick={downloadTxt}
                className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
              >
                ⬇️ Download as .txt
              </button>
              <button
                onClick={syncToProfile}
                className={`flex items-center gap-2 px-5 py-3 font-medium rounded-xl transition-all border ${
                  synced
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300 hover:text-white'
                }`}
              >
                {synced ? '✅ Synced to Profile!' : '🔗 Sync to Profile'}
              </button>
              <button
                onClick={startOver}
                className="flex items-center gap-2 px-5 py-3 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition-all border border-slate-700"
              >
                🔄 Start Over
              </button>
            </div>

            {/* Diff summary */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Changes Summary</h3>
              <div className="space-y-2">
                {approvedSuggestions.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded border capitalize shrink-0 ${CATEGORY_COLORS[s.category]}`}>
                      {s.category}
                    </span>
                    <span className="text-slate-400">{s.section} — {s.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revised text preview */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Revised Resume</h3>
              <pre className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-[600px]">
                {revisedText}
              </pre>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
