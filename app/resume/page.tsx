'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import type { Suggestion } from '../api/analyze-resume/route';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getResumeReport, saveResumeReport, saveProfile, clearDerivedData } from '@/app/lib/db';

type Step = 'saved' | 'upload' | 'review' | 'export';
type Category = 'all' | 'impact' | 'ats' | 'clarity' | 'gaps' | 'formatting';

const STORAGE_KEY = 'jobpilot_resume_report';
const DRAFT_KEY = 'jobpilot_resume_draft';

interface SavedReport {
  revisedText: string;
  appliedCount: number;
  approvedSuggestions: Suggestion[];
  savedAt: string; // ISO date
}

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
  const supabase = useSupabase();
  const [step, setStep] = useState<Step>('upload');
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
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
  const [approvedSuggestions, setApprovedSuggestionsState] = useState<Suggestion[]>([]);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved report or draft on mount
  useEffect(() => {
    (async () => {
      try {
        const report = await getResumeReport(supabase);
        if (report) {
          setSavedReport(report as SavedReport);
          setStep('saved');
          return;
        }
        // No finished report — restore upload draft if one exists
        const draftRaw = localStorage.getItem(DRAFT_KEY);
        if (draftRaw) {
          const draft = JSON.parse(draftRaw) as { text: string; fileName: string };
          if (draft.text) {
            setResumeText(draft.text);
            setPastedText(draft.text);
            setFileName(draft.fileName || '');
          }
        }
      } catch {}
    })();
  }, [supabase]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const persistReport = (report: SavedReport) => {
    saveResumeReport(supabase, report);
    setSavedReport(report);
    // Draft is no longer needed once a full report is saved
    localStorage.removeItem(DRAFT_KEY);
  };

  const clearReport = () => {
    clearDerivedData(supabase);
    localStorage.removeItem(DRAFT_KEY);
    setSavedReport(null);
    setStep('upload');
    setResumeText('');
    setPastedText('');
    setSuggestions([]);
    setDecisions({});
    setRevisedText('');
    setAppliedCount(0);
    setApprovedSuggestionsState([]);
    setFileName('');
    setError('');
    setFilterCategory('all');
    setSynced(false);
    setShowClearConfirm(false);
  };

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

      // Persist draft so it survives page navigation
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: data.text, fileName: file.name }));

      // New resume detected → clear ALL stale cached data first
      await clearDerivedData(supabase);
      setSavedReport(null);

      // Then populate profile from extracted fields (fresh start)
      if (data.extracted) {
        try {
          const profile: Record<string, string> = {};
          if (data.extracted.name) profile.fullName = data.extracted.name;
          if (data.extracted.currentTitle) profile.currentTitle = data.extracted.currentTitle;
          if (data.extracted.yearsExperience) profile.yearsExperience = data.extracted.yearsExperience;
          if (data.extracted.location) profile.location = data.extracted.location;
          if (data.extracted.linkedin) profile.linkedinUrl = data.extracted.linkedin;
          if (data.extracted.github) profile.githubUrl = data.extracted.github;
          if (data.extracted.website) profile.portfolioUrl = data.extracted.website;
          profile.workExperience = data.text;
          await saveProfile(supabase, profile);
        } catch {}
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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

  const computedApproved = suggestions.filter((s) => decisions[s.id] === 'approved');
  const filteredSuggestions = filterCategory === 'all'
    ? suggestions
    : suggestions.filter((s) => s.category === filterCategory);

  const applyChanges = async () => {
    if (computedApproved.length === 0) return;
    setExporting(true);
    setError('');
    try {
      const res = await fetch('/api/export-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: resumeText, approvedSuggestions: computedApproved }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Export failed');
      setRevisedText(data.revisedText);
      setAppliedCount(data.appliedCount);
      setApprovedSuggestionsState(computedApproved);

      // Persist the report so it shows on next visit
      persistReport({
        revisedText: data.revisedText,
        appliedCount: data.appliedCount,
        approvedSuggestions: computedApproved,
        savedAt: new Date().toISOString(),
      });

      // Auto-sync: update profile and clear stale stories/market data
      autoSyncAfterRefinement(data.revisedText);

      setStep('export');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ── Step 3: export ───────────────────────────────────────────────────────
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revised-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncToProfile = async (text: string) => {
    try {
      const extracted = extractFieldsFromText(text);
      const saved = localStorage.getItem('jobpilot_profile');
      const profile = saved ? JSON.parse(saved) : {};
      profile.workExperience = text;
      if (extracted.fullName) profile.fullName = extracted.fullName;
      if (extracted.currentTitle) profile.currentTitle = extracted.currentTitle;
      if (extracted.yearsExperience) profile.yearsExperience = extracted.yearsExperience;
      if (extracted.location) profile.location = extracted.location;
      if (extracted.linkedinUrl) profile.linkedinUrl = extracted.linkedinUrl;
      if (extracted.githubUrl) profile.githubUrl = extracted.githubUrl;
      if (extracted.portfolioUrl) profile.portfolioUrl = extracted.portfolioUrl;
      await saveProfile(supabase, profile);
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    } catch {
      setError('Failed to sync to profile.');
    }
  };

  /** Extract profile fields from resume text (client-side mirror of server extractFields) */
  const extractFieldsFromText = (text: string) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
    const githubMatch = text.match(/github\.com\/[\w-]+/i);
    const websiteMatch = text.match(/https?:\/\/(?!linkedin|github)[\w.-]+\.[a-z]{2,}[\w/.-]*/i);

    const nameLine = lines.find(
      (l) => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(l) && l.split(' ').length <= 4
    );

    // Title: line after name, or common title patterns
    const nameIdx = nameLine ? lines.indexOf(nameLine) : -1;
    let currentTitle = '';
    if (nameIdx >= 0 && nameIdx + 1 < lines.length) {
      const nextLine = lines[nameIdx + 1];
      if (nextLine && !/[@()\d{3}]/.test(nextLine) && !nextLine.includes('http') && nextLine.length < 80) {
        currentTitle = nextLine;
      }
    }
    if (!currentTitle) {
      const titlePatterns = /\b(senior|staff|principal|lead|director|vp|manager|head of|chief)\b.*\b(designer|engineer|developer|product|ux|ui|architect|analyst|scientist|consultant)\b/i;
      const titleLine = lines.find((l) => titlePatterns.test(l) && l.length < 80);
      if (titleLine) currentTitle = titleLine;
    }

    // Years of experience
    let yearsExperience = '';
    const yearsMatch = text.match(/(\d{1,2})\+?\s*years?\s*(of\s*)?(professional\s*)?(experience|in\b)/i);
    if (yearsMatch) {
      yearsExperience = yearsMatch[1];
    } else {
      const expIdx = lines.findIndex((l) => /^(work\s)?experience/i.test(l));
      if (expIdx !== -1) {
        const expSection = lines.slice(expIdx, expIdx + 60).join(' ');
        const yearMatches = expSection.match(/\b(19|20)\d{2}\b/g);
        if (yearMatches && yearMatches.length > 0) {
          const earliest = Math.min(...yearMatches.map(Number));
          const years = new Date().getFullYear() - earliest;
          if (years > 0 && years < 50) yearsExperience = String(years);
        }
      }
    }

    // Location
    let location = '';
    const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
    if (locationMatch) location = locationMatch[0];

    return {
      fullName: nameLine || '',
      currentTitle,
      yearsExperience,
      location,
      linkedinUrl: linkedinMatch ? `https://www.${linkedinMatch[0]}` : '',
      githubUrl: githubMatch ? `https://www.${githubMatch[0]}` : '',
      portfolioUrl: websiteMatch?.[0] || '',
      email: emailMatch?.[0] || '',
    };
  };

  /** Auto-sync: update ALL profile fields + regenerate stories from revised resume */
  const autoSyncAfterRefinement = async (revisedText: string) => {
    try {
      // 1. Extract all fields from revised text
      const extracted = extractFieldsFromText(revisedText);

      // 2. Merge into existing profile (only overwrite non-empty extracted values)
      const saved = localStorage.getItem('jobpilot_profile');
      const profile = saved ? JSON.parse(saved) : {};
      profile.workExperience = revisedText;
      if (extracted.fullName) profile.fullName = extracted.fullName;
      if (extracted.currentTitle) profile.currentTitle = extracted.currentTitle;
      if (extracted.yearsExperience) profile.yearsExperience = extracted.yearsExperience;
      if (extracted.location) profile.location = extracted.location;
      if (extracted.linkedinUrl) profile.linkedinUrl = extracted.linkedinUrl;
      if (extracted.githubUrl) profile.githubUrl = extracted.githubUrl;
      if (extracted.portfolioUrl) profile.portfolioUrl = extracted.portfolioUrl;
      await saveProfile(supabase, profile);

      // 3. Clear old stories and market analysis so they regenerate from new resume
      localStorage.removeItem('jobpilot_experience_bank');
      localStorage.removeItem('jobpilot_market_report');

      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    } catch {
      setError('Failed to auto-sync.');
    }
  };

  // ── Shared export panel (used by both 'saved' and 'export' steps) ────────
  const ExportPanel = ({ report, onNewAnalysis }: { report: { revisedText: string; appliedCount: number; approvedSuggestions: Suggestion[]; savedAt?: string }; onNewAnalysis?: () => void }) => (
    <div className="space-y-6">
      {/* Success header */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-start gap-4">
        <div className="text-4xl">🎉</div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{report.appliedCount} changes applied</h2>
          <p className="text-slate-400 text-sm mt-1">Your resume has been revised and optimized.</p>
          {report.savedAt && (
            <p className="text-slate-500 text-xs mt-1">
              Last updated {new Date(report.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        {/* Clear / restart */}
        <div className="shrink-0">
          {showClearConfirm ? (
            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-slate-400">Clear this report?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={clearReport}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition"
                >
                  Yes, clear
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition"
            >
              🗑 Clear & restart
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => copyToClipboard(report.revisedText)}
          className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all"
        >
          {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
        </button>
        <button
          onClick={() => downloadTxt(report.revisedText)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
        >
          ⬇️ Download as .txt
        </button>
        <button
          onClick={() => syncToProfile(report.revisedText)}
          className={`flex items-center gap-2 px-5 py-3 font-medium rounded-xl transition-all border ${
            synced
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300 hover:text-white'
          }`}
        >
          {synced ? '✅ Synced to Profile!' : '🔗 Sync to Profile'}
        </button>
        {onNewAnalysis && (
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-2 px-5 py-3 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition-all border border-slate-700"
          >
            🔍 Analyze New Resume
          </button>
        )}
      </div>

      {/* Changes summary */}
      {report.approvedSuggestions.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Changes Summary</h3>
          <div className="space-y-2">
            {report.approvedSuggestions.map((s) => (
              <div key={s.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded border capitalize shrink-0 ${CATEGORY_COLORS[s.category]}`}>
                  {s.category}
                </span>
                <span className="text-slate-400">{s.section} — {s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revised text preview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Revised Resume</h3>
        <pre className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-[600px]">
          {report.revisedText}
        </pre>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Resume Reviser</h1>
          <p className="text-slate-400 mt-1">AI-powered resume analysis and optimization.</p>
        </div>

        {/* Step indicator — only show for upload/review/export flow */}
        {step !== 'saved' && (
          <div className="flex items-center gap-2 mb-8">
            {(['upload', 'review', 'export'] as Exclude<Step, 'saved'>[]).map((s, i) => {
              const labels = ['Upload', 'Review', 'Export'];
              const isActive = step === s;
              const stepsOrder = ['upload', 'review', 'export'];
              const isPast = stepsOrder.indexOf(step) > i;
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
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── SAVED REPORT (returning user) ──────────────────────────────── */}
        {step === 'saved' && savedReport && (
          <ExportPanel
            report={savedReport}
            onNewAnalysis={() => {
              // Go to upload but keep the report in storage until they explicitly clear
              setStep('upload');
            }}
          />
        )}

        {/* ── STEP 1: UPLOAD ─────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Back to saved report link */}
            {savedReport && (
              <button
                onClick={() => setStep('saved')}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition"
              >
                ← Back to your last report
              </button>
            )}

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
              onChange={(e) => {
                setPastedText(e.target.value);
                // Persist draft so edits survive page navigation
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: e.target.value, fileName }));
              }}
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
                <p className="text-slate-400 text-sm mt-0.5">{computedApproved.length} approved · {suggestions.filter(s => decisions[s.id] === 'skipped').length} skipped</p>
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
                          value={(s as Suggestion & { _edited?: string })._edited ?? s.revised}
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
                disabled={computedApproved.length === 0 || exporting}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <><span className="animate-spin">⟳</span> Applying changes…</>
                ) : (
                  `Apply ${computedApproved.length} Approved Changes →`
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: EXPORT ─────────────────────────────────────────── */}
        {step === 'export' && (
          <ExportPanel
            report={{ revisedText, appliedCount, approvedSuggestions, savedAt: new Date().toISOString() }}
          />
        )}
      </div>
    </AppLayout>
  );
}
