'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface Job {
  id: number;
  company: string;
  role: string;
  salary: string;
  match: number;
  location: string;
  posted: string;
  companyOutlook: string;
  compatibility: string;
  url: string;
  jobPostingUrl?: string;
}

const seedJobs: Job[] = [
  {
    id: 1,
    company: 'Anthropic',
    role: 'Product Designer',
    salary: '$180–220K',
    match: 95,
    location: 'San Francisco, CA (Remote OK)',
    posted: 'Mar 15, 2026',
    companyOutlook: 'Anthropic raised $7.3B Series E, expanding product design team',
    compatibility: 'Cognitive science + AI product experience is a direct match',
    url: 'https://anthropic.com/careers',
    jobPostingUrl: 'https://boards.greenhouse.io/anthropic/jobs/product-designer',
  },
  {
    id: 2,
    company: 'Figma',
    role: 'Senior Product Designer',
    salary: '$175–210K',
    match: 88,
    location: 'San Francisco, CA (Hybrid)',
    posted: 'Mar 14, 2026',
    companyOutlook: 'Figma growing post-Adobe acquisition block, doubling design team',
    compatibility: '7+ yrs product design + design systems experience aligns perfectly',
    url: 'https://figma.com/careers',
    jobPostingUrl: 'https://boards.greenhouse.io/figma/jobs/senior-product-designer',
  },
  {
    id: 3,
    company: 'OpenAI',
    role: 'AI UX Designer',
    salary: '$190–240K',
    match: 91,
    location: 'San Francisco, CA (Hybrid)',
    posted: 'Mar 13, 2026',
    companyOutlook: 'OpenAI at $157B valuation, aggressive product expansion',
    compatibility: 'Solo AI app builder background rare among UX candidates',
    url: 'https://openai.com/careers',
    jobPostingUrl: 'https://openai.com/careers/ai-ux-designer',
  },
];

function MatchBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-900/40 text-green-400 border-green-800' : score >= 80 ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-yellow-900/40 text-yellow-400 border-yellow-800';
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${color}`}>
      {score}% match
    </span>
  );
}

export default function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [appliedJobs, setAppliedJobs] = useState<Set<number>>(new Set());

  // Load profile + applied jobs on mount
  useEffect(() => {
    const saved = localStorage.getItem('jobpilot_profile');
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
    const savedApplied = localStorage.getItem('jobpilot_applied');
    if (savedApplied) {
      try { setAppliedJobs(new Set(JSON.parse(savedApplied))); } catch {}
    }
  }, []);

  const toggleApplied = (jobId: number) => {
    const job = seedJobs.find((j) => j.id === jobId);
    setAppliedJobs((prev) => {
      const next = new Set(prev);
      const isNowApplied = !next.has(jobId);
      isNowApplied ? next.add(jobId) : next.delete(jobId);
      localStorage.setItem('jobpilot_applied', JSON.stringify([...next]));

      // Sync to applications board
      if (job) {
        const savedApps = localStorage.getItem('jobpilot_applications');
        let apps: { id: number; company: string; role: string; date: string; status: string }[] = [];
        try { apps = savedApps ? JSON.parse(savedApps) : []; } catch {}
        if (isNowApplied) {
          // Add to Applied column if not already there
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
          // Remove from applications board
          apps = apps.filter((a) => a.id !== jobId);
        }
        localStorage.setItem('jobpilot_applications', JSON.stringify(apps));
      }
      return next;
    });
  };

  const filteredJobs = seedJobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      (!q || j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q)) &&
      (!filterLocation || j.location.includes(filterLocation)) &&
      (!filterType || j.role.includes(filterType))
    );
  });

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

  return (
    <AppLayout>
      <div className="flex gap-0 h-[calc(100vh-4rem)] -m-8">
        {/* Left panel */}
        <div className="w-[40%] border-r border-slate-800 flex flex-col overflow-hidden">
          {/* Search & filters */}
          <div className="p-5 border-b border-slate-800 space-y-3">
            <h1 className="text-xl font-bold text-white">Job Board</h1>
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
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="San Francisco">San Francisco</option>
              </select>
              <select
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-violet-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Product Designer">Product Designer</option>
                <option value="UX Designer">UX Designer</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
          </div>

          {/* Job cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredJobs.length === 0 && (
              <div className="text-center text-slate-500 py-12 text-sm">No jobs match your search.</div>
            )}
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition ${
                  selectedJob?.id === job.id ? 'border-violet-500' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{job.company}</div>
                    <div className="text-sm text-slate-400">{job.role}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MatchBadge score={job.match} />
                    {appliedJobs.has(job.id) && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ✓ Applied
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span>💰 {job.salary}</span>
                  <span>📍 {job.location.split(' (')[0]}</span>
                </div>
                <div className="text-xs text-slate-500 mb-3">Posted {job.posted}</div>

                {/* Why this role — always visible */}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-violet-400 mb-2">✨ Why this role for you</p>
                  <p className="text-xs text-slate-300 flex gap-2 mb-1.5">
                    <span>🏢</span><span>{job.companyOutlook}</span>
                  </p>
                  <p className="text-xs text-slate-300 flex gap-2">
                    <span>🎯</span><span>{job.compatibility}</span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedJob(job)}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  Apply →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto">
          {!selectedJob ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <div className="text-5xl mb-4">✈️</div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Select a job to apply</h3>
              <p className="text-slate-500 text-sm">Click "Apply" on any job card to see your pre-filled application.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Job header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedJob.company} — {selectedJob.role}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                    <span>{selectedJob.salary}</span>
                    <span>·</span>
                    <span>{selectedJob.location}</span>
                    <span>·</span>
                    <MatchBadge score={selectedJob.match} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex gap-2">
                    <a
                      href={selectedJob.jobPostingUrl || selectedJob.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
                    >
                      Open Job Page →
                    </a>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-lg transition"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Applied toggle */}
                  <button
                    onClick={() => toggleApplied(selectedJob.id)}
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
                </div>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Why this role — prominent at top of Form Assist */}
              <div className="bg-violet-500/10 border border-violet-500/25 rounded-xl p-5">
                <p className="text-sm font-semibold text-violet-300 mb-3">✨ Why this role is a fit for you</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="text-lg">🏢</span>
                    <div>
                      <p className="text-xs text-violet-400 font-medium mb-0.5">Company Outlook</p>
                      <p className="text-sm text-slate-200">{selectedJob.companyOutlook}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="text-xs text-violet-400 font-medium mb-0.5">Your Compatibility</p>
                      <p className="text-sm text-slate-200">{selectedJob.compatibility}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-1">Form Assist</h3>
                <p className="text-xs text-slate-500 mb-5">Your profile info, ready to copy.</p>
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
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
