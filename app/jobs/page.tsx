'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getJobs, saveJob, deleteJob, getApplications, saveApplications, getProfile, getExperienceEntries, getQAAnswers, saveQAAnswers } from '@/app/lib/db';
import type { JobListing } from '@/app/lib/db';

type Job = JobListing;

function MatchBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-900/40 text-green-400 border-green-800' : score >= 80 ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-yellow-900/40 text-yellow-400 border-yellow-800';
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${color}`}>
      {score}% match
    </span>
  );
}

function JobCard({
  job,
  isSelected,
  isApplied,
  onClick,
  onApply,
  onDelete,
}: {
  job: Job;
  isSelected: boolean;
  isApplied: boolean;
  onClick: () => void;
  onApply: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition ${
        isSelected ? 'border-violet-500' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">{job.company}</div>
          <div className="text-sm text-slate-400">{job.role}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <div className="flex items-center gap-1">
            {job.matchScore && job.matchScore > 0 && <MatchBadge score={job.matchScore} />}
            <button
              onClick={onDelete}
              className="p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Remove job"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          {isApplied && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              ✓ Applied
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        {job.salary && <span>💰 {job.salary}</span>}
        {job.location && <span>📍 {job.location.split(' (')[0]}</span>}
      </div>
      {job.postedDate && <div className="text-xs text-slate-500 mb-3">Posted {job.postedDate}</div>}

      {/* Why this role — only show if outlook or compatibility are filled */}
      {(job.companyOutlook || job.compatibility) && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-violet-400 mb-2">✨ Why this role for you</p>
          {job.companyOutlook && (
            <p className="text-xs text-slate-300 flex gap-2 mb-1.5">
              <span>🏢</span><span>{job.companyOutlook}</span>
            </p>
          )}
          {job.compatibility && (
            <p className="text-xs text-slate-300 flex gap-2">
              <span>🎯</span><span>{job.compatibility}</span>
            </p>
          )}
        </div>
      )}

      {(job.jobPostingUrl || job.url) ? (
        <button
          onClick={onApply}
          className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Apply →
        </button>
      ) : null}
    </div>
  );
}

interface QAResult {
  question: string;
  answer: string;
}

export default function JobsPage() {
  const supabase = useSupabase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rightTab, setRightTab] = useState<'form' | 'questions'>('form');
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [appliedFolderOpen, setAppliedFolderOpen] = useState(false);

  // Add Job form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    company: '',
    role: '',
    salary: '',
    location: '',
    jobPostingUrl: '',
    notes: '',
  });
  const [addFormSaving, setAddFormSaving] = useState(false);

  // Delete confirmation state
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Q&A state
  const [rawQuestions, setRawQuestions] = useState('');
  const [qaResults, setQaResults] = useState<QAResult[]>([]);
  const [qaSavedAt, setQaSavedAt] = useState<string | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState('');
  const [copiedAnswer, setCopiedAnswer] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load jobs + profile + applied jobs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, p] = await Promise.all([
        getJobs(supabase),
        getProfile(supabase),
      ]);
      if (cancelled) return;
      setJobs(loaded);
      if (p) setProfile(p as unknown as Record<string, string>);

      if (supabase) {
        const apps = await getApplications(supabase);
        if (cancelled) return;
        const ids = new Set<string>();
        apps.forEach((a) => {
          const match = loaded.find((j) => j.role === a.jobTitle && j.company === a.company);
          if (match && match.id) ids.add(match.id);
        });
        setAppliedJobs(ids);
      } else {
        const savedApplied = localStorage.getItem('jobpilot_applied');
        if (savedApplied) {
          try { setAppliedJobs(new Set(JSON.parse(savedApplied))); } catch {}
        }
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // When selected job changes, load its saved Q&A (if any)
  useEffect(() => {
    if (!selectedJob) return;
    let cancelled = false;
    (async () => {
      const allAnswers = await getQAAnswers(supabase);
      if (cancelled) return;
      if (allAnswers.length > 0) {
        setQaResults(allAnswers);
        setQaSavedAt(new Date().toISOString());
        setRawQuestions('');
      } else {
        setQaResults([]);
        setQaSavedAt(null);
        setRawQuestions('');
      }
      setQaError('');
      setShowClearConfirm(false);
    })();
    return () => { cancelled = true; };
  }, [selectedJob?.id, supabase]);

  const handleAddJob = async () => {
    if (!addFormData.company.trim() || !addFormData.role.trim()) return;
    setAddFormSaving(true);
    try {
      const newJob: Job = {
        company: addFormData.company.trim(),
        role: addFormData.role.trim(),
        salary: addFormData.salary.trim() || undefined,
        location: addFormData.location.trim() || undefined,
        jobPostingUrl: addFormData.jobPostingUrl.trim() || undefined,
        notes: addFormData.notes.trim() || undefined,
      };
      const saved = await saveJob(supabase, newJob);
      setJobs((prev) => [saved, ...prev]);
      setAddFormData({ company: '', role: '', salary: '', location: '', jobPostingUrl: '', notes: '' });
      setShowAddForm(false);
    } finally {
      setAddFormSaving(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    await deleteJob(supabase, jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
      setMobileShowDetail(false);
    }
    setDeletingJobId(null);
  };

  const toggleApplied = useCallback((jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    setAppliedJobs((prev) => {
      const next = new Set(prev);
      const isNowApplied = !next.has(jobId);
      isNowApplied ? next.add(jobId) : next.delete(jobId);

      if (!supabase) {
        localStorage.setItem('jobpilot_applied', JSON.stringify([...next]));
      }

      // Sync to applications board
      if (job) {
        (async () => {
          if (supabase) {
            const existingApps = await getApplications(supabase);
            let apps = [...existingApps];
            if (isNowApplied) {
              if (!apps.find((a) => a.jobTitle === job.role && a.company === job.company)) {
                apps.push({
                  id: jobId,
                  jobTitle: job.role,
                  company: job.company,
                  appliedAt: new Date().toISOString(),
                  status: 'applied',
                  notes: '',
                });
              }
            } else {
              apps = apps.filter((a) => !(a.jobTitle === job.role && a.company === job.company));
            }
            await saveApplications(supabase, apps);
          } else {
            const savedApps = localStorage.getItem('jobpilot_applications');
            let apps: { id: string; company: string; role: string; date: string; status: string }[] = [];
            try { apps = savedApps ? JSON.parse(savedApps) : []; } catch {}
            if (isNowApplied) {
              if (!apps.find((a) => a.id === jobId)) {
                apps.push({
                  id: jobId,
                  company: job.company,
                  role: job.role,
                  date: new Date().toISOString().split('T')[0],
                  status: 'applied',
                });
              }
            } else {
              apps = apps.filter((a) => a.id !== jobId);
            }
            localStorage.setItem('jobpilot_applications', JSON.stringify(apps));
          }
        })();
      }
      return next;
    });
  }, [supabase, jobs]);

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      (!q || j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q)) &&
      (!filterLocation || (j.location && j.location.includes(filterLocation))) &&
      (!filterType || j.role.includes(filterType))
    );
  });

  // Derive unique locations and roles from actual jobs for filter dropdowns
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    jobs.forEach((j) => {
      if (!j.location) return;
      // Extract meaningful location tokens
      const parts = j.location.split(/[\/,]/).map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => locs.add(p));
    });
    return Array.from(locs).sort();
  }, [jobs]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    jobs.forEach((j) => {
      // Extract a simplified role keyword
      const role = j.role;
      if (role.includes('Product Designer')) roles.add('Product Designer');
      if (role.includes('UX Designer')) roles.add('UX Designer');
      if (role.includes('Design Engineer')) roles.add('Design Engineer');
      if (role.includes('Senior') || role.includes('Sr.')) roles.add('Senior');
      if (role.includes('Staff')) roles.add('Staff');
    });
    return Array.from(roles).sort();
  }, [jobs]);

  // Split into unapplied (primary) and applied (folder)
  const unappliedJobs = filteredJobs.filter((j) => !j.id || !appliedJobs.has(j.id));
  const appliedFilteredJobs = filteredJobs.filter((j) => j.id && appliedJobs.has(j.id));

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const profileFields = [
    { section: 'Personal', fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'currentTitle', label: 'Current Title' },
      { key: 'location', label: 'Location' },
      { key: 'yearsExperience', label: 'Years of Experience' },
    ]},
    { section: 'Experience', fields: [
      { key: 'workExperience', label: 'Work Experience' },
      { key: 'differentiation', label: 'What Makes You Different' },
      { key: 'sideProjects', label: 'Side Projects / Accomplishments' },
    ]},
    { section: 'Skills', fields: [
      { key: 'topSkills', label: 'Top Skills' },
      { key: 'targetCompensation', label: 'Target Compensation' },
      { key: 'workStyle', label: 'Work Style' },
    ]},
    { section: 'Links', fields: [
      { key: 'linkedinUrl', label: 'LinkedIn' },
      { key: 'portfolioUrl', label: 'Portfolio' },
      { key: 'githubUrl', label: 'GitHub' },
    ]},
    { section: 'Full Resume Text', fields: [
      { key: 'workExperience', label: 'Resume / Experience (parsed from PDF)' },
    ]},
  ];

  const generateAnswers = async () => {
    if (!selectedJob || !rawQuestions.trim()) return;
    setQaLoading(true);
    setQaError('');
    try {
      // Load experience bank from db
      const experienceBank = await getExperienceEntries(supabase);

      const res = await fetch('/api/answer-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawQuestions,
          profile,
          job: {
            company: selectedJob.company,
            role: selectedJob.role,
            companyOutlook: selectedJob.companyOutlook,
            compatibility: selectedJob.compatibility,
          },
          experienceBank,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');
      const now = new Date().toISOString();
      // Append new answers to existing, then save combined set
      setQaResults((prev) => {
        const combined = [...prev, ...data.results];
        saveQAAnswers(supabase, combined);
        return combined;
      });
      setQaSavedAt(now);
      setRawQuestions(''); // clear the input box after generation
    } catch (e: unknown) {
      setQaError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setQaLoading(false);
    }
  };

  const clearAnswers = () => {
    if (!selectedJob) return;
    saveQAAnswers(supabase, []);
    setQaResults([]);
    setQaSavedAt(null);
    setRawQuestions('');
    setShowClearConfirm(false);
  };

  const copyAnswer = (answer: string, idx: number) => {
    navigator.clipboard.writeText(answer);
    setCopiedAnswer(idx);
    setTimeout(() => setCopiedAnswer(null), 1800);
  };

  const cardProps = (job: Job) => ({
    job,
    isSelected: selectedJob?.id === job.id,
    isApplied: !!job.id && appliedJobs.has(job.id),
    onClick: () => handleJobSelect(job),
    onApply: (e: React.MouseEvent) => {
      e.stopPropagation();
      const url = job.jobPostingUrl || job.url;
      if (url) window.open(url, '_blank');
    },
    onDelete: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (job.id) setDeletingJobId(job.id);
    },
  });

  // Mobile: when a job is selected, show right panel as overlay
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setMobileShowDetail(true);
  };

  const handleCloseDetail = () => {
    setMobileShowDetail(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] -m-4 md:-m-8 md:-mt-8">
        {/* Left panel */}
        <div className={`w-full md:w-[40%] border-r border-slate-800 flex flex-col overflow-hidden ${mobileShowDetail ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & filters */}
          <div className="p-5 border-b border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Job Board</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                {filteredJobs.length} {filteredJobs.length !== jobs.length ? `of ${jobs.length}` : 'jobs'}
              </span>
            </div>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
              placeholder="Search roles, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-violet-500"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                <option value="">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <select
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-violet-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Add Job button */}
            <button
              onClick={() => setShowAddForm((o) => !o)}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Add Job
            </button>
          </div>

          {/* Add Job form — inline, collapsible */}
          {showAddForm && (
            <div className="p-4 border-b border-slate-800 bg-slate-800/40 space-y-3">
              <div className="space-y-2">
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                  placeholder="Company *"
                  value={addFormData.company}
                  onChange={(e) => setAddFormData((d) => ({ ...d, company: e.target.value }))}
                />
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                  placeholder="Role / Title *"
                  value={addFormData.role}
                  onChange={(e) => setAddFormData((d) => ({ ...d, role: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                    placeholder="Salary"
                    value={addFormData.salary}
                    onChange={(e) => setAddFormData((d) => ({ ...d, salary: e.target.value }))}
                  />
                  <input
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                    placeholder="Location"
                    value={addFormData.location}
                    onChange={(e) => setAddFormData((d) => ({ ...d, location: e.target.value }))}
                  />
                </div>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                  placeholder="Job URL"
                  value={addFormData.jobPostingUrl}
                  onChange={(e) => setAddFormData((d) => ({ ...d, jobPostingUrl: e.target.value }))}
                />
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                  placeholder="Notes"
                  rows={2}
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData((d) => ({ ...d, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddJob}
                  disabled={addFormSaving || !addFormData.company.trim() || !addFormData.role.trim()}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition"
                >
                  {addFormSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setAddFormData({ company: '', role: '', salary: '', location: '', jobPostingUrl: '', notes: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Job cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Empty state */}
            {jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No jobs yet.</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Add your first job listing to get started with tracking and AI-powered application help.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
                >
                  <span className="text-lg leading-none">+</span> Add Your First Job
                </button>
              </div>
            )}

            {/* No search results (but jobs exist) */}
            {jobs.length > 0 && unappliedJobs.length === 0 && appliedFilteredJobs.length === 0 && (
              <div className="text-center text-slate-500 py-12 text-sm">No jobs match your search.</div>
            )}
            {jobs.length > 0 && unappliedJobs.length === 0 && appliedFilteredJobs.length > 0 && (
              <div className="text-center text-slate-500 py-8 text-sm">
                All matching jobs are in your Applied folder below.
              </div>
            )}
            {unappliedJobs.map((job) => (
              <JobCard key={job.id} {...cardProps(job)} />
            ))}

            {/* Applied folder — collapsed by default */}
            {appliedFilteredJobs.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setAppliedFolderOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-300 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>{appliedFolderOpen ? '📂' : '📁'}</span>
                    <span>Applied</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      {appliedFilteredJobs.length}
                    </span>
                  </span>
                  <span className="text-slate-600 text-xs">{appliedFolderOpen ? '▲ collapse' : '▼ view all'}</span>
                </button>
                {appliedFolderOpen && (
                  <div className="mt-3 space-y-3">
                    {appliedFilteredJobs.map((job) => (
                      <JobCard key={job.id} {...cardProps(job)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation modal */}
        {deletingJobId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full space-y-4">
              <h3 className="text-lg font-semibold text-white">Remove this job?</h3>
              <p className="text-sm text-slate-400">This will permanently remove the job listing. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingJobId(null)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteJob(deletingJobId)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right panel */}
        <div className={`flex-1 overflow-y-auto ${mobileShowDetail ? 'flex flex-col' : 'hidden md:block'}`}>
          {/* Mobile back button */}
          <button
            onClick={handleCloseDetail}
            className="md:hidden flex items-center gap-2 px-4 py-3 text-sm text-slate-400 hover:text-white border-b border-slate-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to jobs
          </button>

          {!selectedJob ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="text-5xl mb-4">✈️</div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Select a job to apply</h3>
              <p className="text-slate-500 text-sm">Click on any job card to see your pre-filled application and AI-powered tools.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Job header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">{selectedJob.company} — {selectedJob.role}</h2>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 text-sm text-slate-400">
                    {selectedJob.salary && <><span>{selectedJob.salary}</span><span>·</span></>}
                    {selectedJob.location && <><span>{selectedJob.location}</span><span>·</span></>}
                    {selectedJob.matchScore && selectedJob.matchScore > 0 && <MatchBadge score={selectedJob.matchScore} />}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-start md:items-end">
                  <div className="flex gap-2">
                    {(selectedJob.jobPostingUrl || selectedJob.url) && (
                      <a
                        href={selectedJob.jobPostingUrl || selectedJob.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
                      >
                        Open Job Page →
                      </a>
                    )}
                    <button
                      onClick={() => { setSelectedJob(null); setMobileShowDetail(false); }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-lg transition"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Applied toggle */}
                  {selectedJob.id && (
                    <button
                      onClick={() => toggleApplied(selectedJob.id!)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        appliedJobs.has(selectedJob.id)
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        appliedJobs.has(selectedJob.id)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-500'
                      }`}>
                        {appliedJobs.has(selectedJob.id) && (
                          <span className="text-white text-[9px] font-bold">✓</span>
                        )}
                      </span>
                      {appliedJobs.has(selectedJob.id) ? 'Applied ✓' : 'Mark as Applied'}
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Notes — show if present */}
              {selectedJob.notes && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-slate-200">{selectedJob.notes}</p>
                </div>
              )}

              {/* Why this role — only show if companyOutlook or compatibility exists */}
              {(selectedJob.companyOutlook || selectedJob.compatibility) && (
                <div className="bg-violet-500/10 border border-violet-500/25 rounded-xl p-5">
                  <p className="text-sm font-semibold text-violet-300 mb-3">✨ Why this role is a fit for you</p>
                  <div className="space-y-3">
                    {selectedJob.companyOutlook && (
                      <div className="flex gap-3">
                        <span className="text-lg">🏢</span>
                        <div>
                          <p className="text-xs text-violet-400 font-medium mb-0.5">Company Outlook</p>
                          <p className="text-sm text-slate-200">{selectedJob.companyOutlook}</p>
                        </div>
                      </div>
                    )}
                    {selectedJob.compatibility && (
                      <div className="flex gap-3">
                        <span className="text-lg">🎯</span>
                        <div>
                          <p className="text-xs text-violet-400 font-medium mb-0.5">Your Compatibility</p>
                          <p className="text-sm text-slate-200">{selectedJob.compatibility}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab switcher */}
              <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
                <button
                  onClick={() => setRightTab('form')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    rightTab === 'form'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  📋 Form Assist
                </button>
                <button
                  onClick={() => setRightTab('questions')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    rightTab === 'questions'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  ✍️ Answer Questions
                  {qaResults.length > 0 && (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      {qaResults.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ── FORM ASSIST TAB ── */}
              {rightTab === 'form' && (
                <div>
                  <p className="text-xs text-slate-500 mb-5">Your profile info, ready to copy into any application form.</p>
                  <div className="space-y-6">
                    {profileFields.map((section) => (
                      <div key={section.section}>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{section.section}</h4>
                        <div className="space-y-2">
                          {section.fields.map((field) => {
                            const value = (profile as Record<string, string>)[field.key] || '';
                            if (!value) return null;
                            return (
                              <div key={field.key} className="flex items-start gap-3 bg-slate-800 rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-slate-500 mb-0.5">{field.label}</div>
                                  <div className="text-sm text-slate-200 truncate">{value}</div>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(value, field.key)}
                                  className={`shrink-0 text-xs px-2 py-1 rounded transition ${
                                    copied === field.key
                                      ? 'bg-green-900/40 text-green-400'
                                      : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                                  }`}
                                >
                                  {copied === field.key ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {Object.keys(profile).length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        <p>No profile data yet.</p>
                        <a href="/profile" className="text-violet-400 hover:text-violet-300">Complete your profile →</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ANSWER QUESTIONS TAB ── */}
              {rightTab === 'questions' && (
                <div className="space-y-5">

                  {/* Saved answers — shown when answers exist for this job */}
                  {qaResults.length > 0 && (
                    <div className="space-y-4">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-400">✅ {qaResults.length} saved answer{qaResults.length > 1 ? 's' : ''}</span>
                          {qaSavedAt && (
                            <span className="text-xs text-slate-500">
                              · {new Date(qaSavedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {showClearConfirm ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Clear all answers?</span>
                            <button onClick={() => setShowClearConfirm(false)} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition">No</button>
                            <button onClick={clearAnswers} className="text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition">Yes, clear</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowClearConfirm(true)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-500 hover:text-white transition"
                          >
                            🗑 Clear
                          </button>
                        )}
                      </div>

                      {/* Answer cards */}
                      {qaResults.map((qa, idx) => (
                        <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                            <p className="text-xs font-semibold text-violet-400 mb-0.5">Q{idx + 1}</p>
                            <p className="text-sm text-slate-300">{qa.question}</p>
                          </div>
                          <div className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className="text-xs font-semibold text-emerald-400">Your Answer</p>
                              <button
                                onClick={() => copyAnswer(qa.answer, idx)}
                                className={`shrink-0 text-xs px-3 py-1 rounded-lg font-medium transition ${
                                  copiedAnswer === idx
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                }`}
                              >
                                {copiedAnswer === idx ? '✓ Copied!' : '📋 Copy'}
                              </button>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed">{qa.answer}</p>
                          </div>
                        </div>
                      ))}

                      {/* Divider before add-more section */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-xs text-slate-500">add more questions</span>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>
                    </div>
                  )}

                  {/* Input area — always shown so user can add more questions */}
                  {qaResults.length === 0 && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Open the job page, copy the open-ended questions, and paste them below. AI writes personalized answers using your profile and resume — saved here for interview prep.
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {qaResults.length > 0 ? 'Paste additional questions' : 'Paste questions from the application'}
                    </label>
                    <textarea
                      value={rawQuestions}
                      onChange={(e) => setRawQuestions(e.target.value)}
                      placeholder={`Example:\n1. What makes you excited about the ElevenLabs mission?\n2. Tell us about a product that you think is expertly designed and why?`}
                      rows={5}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none transition"
                    />
                  </div>

                  <button
                    onClick={generateAnswers}
                    disabled={qaLoading || !rawQuestions.trim()}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {qaLoading ? (
                      <><span className="animate-spin text-base">⟳</span> Writing your answers…</>
                    ) : qaResults.length > 0 ? (
                      <>✍️ Generate More Answers</>
                    ) : (
                      <>✍️ Generate Answers</>
                    )}
                  </button>

                  {qaError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      ⚠️ {qaError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
