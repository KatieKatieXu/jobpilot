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
    role: 'Design Engineer, Education Labs',
    salary: '~$200–300K',
    match: 97,
    location: 'San Francisco / NYC',
    posted: 'Mar 2026',
    companyOutlook: '$61B+ valuation, defining AI safety. Education Labs = teaching people to use AI effectively.',
    compatibility: 'Katie is literally already doing this — teaching people to use AI to build things is her content niche. UX + cognitive science + AI builder + educator = unicorn candidate.',
    url: 'https://anthropic.com/careers',
    jobPostingUrl: 'https://job-boards.greenhouse.io/anthropic/jobs/5097186008',
  },
  {
    id: 2,
    company: 'Figma',
    role: 'Product Designer, AI Models',
    salary: '$169–303K',
    match: 95,
    location: 'US Remote / SF / NYC',
    posted: 'Mar 2026',
    companyOutlook: '$12.5B+ valuation. AI Models team = teaching AI to be better design copilots.',
    compatibility: 'Exceptional match — uses Figma daily, built Figma→MCP→Cursor pipeline, cognitive science background directly relevant to developing AI design principles.',
    url: 'https://figma.com/careers',
    jobPostingUrl: 'https://job-boards.greenhouse.io/figma/jobs/5711913004',
  },
  {
    id: 3,
    company: 'OpenAI',
    role: 'Product Designer, ChatGPT',
    salary: '~$200–350K',
    match: 94,
    location: 'San Francisco (Onsite)',
    posted: 'Mar 2026',
    companyOutlook: 'ChatGPT has 100M+ users, pre-IPO. Small design team = high ownership.',
    compatibility: '4+ yrs shipping software, strong UX/UI, complex interaction design, AI-first thinking. PawPaw Story + cognitive science = perfect for AI interfaces.',
    url: 'https://openai.com/careers',
    jobPostingUrl: 'https://openai.com/careers/product-designer-chatgpt-san-francisco/',
  },
  {
    id: 4,
    company: 'Figma',
    role: 'Product Designer, Design/Dev/AI Tools',
    salary: '$169–303K',
    match: 93,
    location: 'US Remote / SF / NYC',
    posted: 'Mar 2026',
    companyOutlook: 'Core product team — Figma Editor, AI, Dev Tools. Values "design/development hybrid background."',
    compatibility: '7+ yrs UX/UI, visual craft, interaction design, AI product experience. Builds apps with AI tools — exactly the hybrid they want.',
    url: 'https://figma.com/careers',
    jobPostingUrl: 'https://job-boards.greenhouse.io/figma/jobs/5711468004',
  },
  {
    id: 5,
    company: 'Google DeepMind',
    role: 'Sr. AI Product Designer, Gemini',
    salary: '~$220–300K',
    match: 90,
    location: 'Mountain View / NYC / SF / Seattle',
    posted: 'Mar 2026',
    companyOutlook: 'Gemini is Google\'s flagship AI product. DeepMind = world\'s leading AI research lab. Billions of potential users.',
    compatibility: '7+ years designing UIs, AI-powered interface portfolio, cross-functional collaboration. Designing "how people create with AI" = PawPaw Story experience.',
    url: 'https://deepmind.google/careers/',
    jobPostingUrl: 'https://job-boards.greenhouse.io/deepmind/jobs/7530716',
  },
  {
    id: 6,
    company: 'ElevenLabs',
    role: 'Product Designer',
    salary: 'TBD ($11B company)',
    match: 89,
    location: 'Remote / London',
    posted: 'Mar 2026',
    companyOutlook: 'Fastest-growing AI audio company. $11B valuation, funded by a16z + Sequoia. Small team, massive scale.',
    compatibility: 'AI-first product design, unexplored problem spaces, ships independently. PawPaw Story matches their "high-velocity lean teams" culture. Remote-friendly.',
    url: 'https://elevenlabs.io/careers',
    jobPostingUrl: 'https://elevenlabs.io/careers/89da00ec-11b0-4359-913b-c3a89c1013bc/product-designer',
  },
  {
    id: 7,
    company: 'OpenAI',
    role: 'Product Designer, Growth',
    salary: '~$200–350K',
    match: 88,
    location: 'San Francisco (Onsite)',
    posted: 'Mar 2026',
    companyOutlook: 'Growth team = adoption, engagement, retention for ChatGPT.',
    compatibility: 'Growth/onboarding experience, consumer-facing products, data + instinct balance. Content creation background shows user acquisition funnel understanding.',
    url: 'https://openai.com/careers',
    jobPostingUrl: 'https://openai.com/careers/product-designer-growth-san-francisco/',
  },
  {
    id: 8,
    company: 'Google DeepMind',
    role: 'Sr. Staff AI Product Designer, Gemini iOS',
    salary: '~$280–400K',
    match: 85,
    location: 'Mountain View / Seattle',
    posted: 'Mar 2026',
    companyOutlook: 'Highest-seniority design role on Gemini iOS — architecting "first-of-their-kind" mobile AI interactions.',
    compatibility: 'Stretch level but worth applying. PawPaw Story iOS + enterprise design leadership shows trajectory. Role values "vibe coding" and AI tools in design — Katie does this daily.',
    url: 'https://deepmind.google/careers/',
    jobPostingUrl: 'https://job-boards.greenhouse.io/deepmind/jobs/7486778',
  },
  {
    id: 9,
    company: 'Figma',
    role: 'Product Designer, Growth & Monetization',
    salary: '$169–303K',
    match: 84,
    location: 'US Remote / SF / NYC',
    posted: 'Mar 2026',
    companyOutlook: 'Growth team at one of the most design-forward companies in the world.',
    compatibility: 'Growth/monetization experience from enterprise BofA work. Content creator background = understanding user funnels.',
    url: 'https://figma.com/careers',
    jobPostingUrl: 'https://boards.greenhouse.io/figma/jobs/5711595004',
  },
  {
    id: 10,
    company: 'Vercel',
    role: 'Senior Product Designer',
    salary: '$156–234K',
    match: 83,
    location: 'US Remote',
    posted: 'Mar 2026',
    companyOutlook: 'Behind Next.js, v0 (AI design tool), AI SDK. 11M+ developers on platform.',
    compatibility: '4+ years design, visual/UI/interaction skills. Uses v0, Cursor, and Claude Code — Katie uses all of these. Builder culture alignment.',
    url: 'https://vercel.com/careers',
    jobPostingUrl: 'https://vercel.com/careers/senior-product-designer-us-5735407004',
  },
  {
    id: 11,
    company: 'Databricks',
    role: 'Sr. Product Designer, AI/BI',
    salary: '$145–199K',
    match: 82,
    location: 'Seattle, WA',
    posted: 'Mar 2026',
    companyOutlook: '$62B+ valuation, 50%+ Fortune 500 use it. IPO candidate. AI/BI team = humans and AI thinking together about data.',
    compatibility: '5+ years product design, HCI/design background, enterprise product experience (BofA), system thinker. Cognitive science + design intersection.',
    url: 'https://databricks.com/careers',
    jobPostingUrl: 'https://www.databricks.com/company/careers/product/sr-product-designer-ai-bi-8429978002',
  },
  {
    id: 12,
    company: 'Linear',
    role: 'Senior / Staff Product Designer',
    salary: 'TBD (well-funded)',
    match: 81,
    location: 'Fully Remote',
    posted: 'Mar 2026',
    companyOutlook: 'Best-in-class product tool. Building AI-powered project management. Known for design craft excellence.',
    compatibility: 'High craft bar, product design excellence. Linear values design taste above all. Remote = no relocation needed.',
    url: 'https://linear.app/careers',
    jobPostingUrl: 'https://linear.app/careers',
  },
  {
    id: 13,
    company: 'Notion',
    role: 'Product Designer, Growth',
    salary: '~$105–250K',
    match: 80,
    location: 'NYC / San Francisco',
    posted: 'Mar 2026',
    companyOutlook: '$10B+ valuation, Notion AI integrations, iconic design culture.',
    compatibility: 'Cross-functional collaboration, design systems, lifecycle design. Enterprise experience + AI building = strong.',
    url: 'https://notion.com/careers',
    jobPostingUrl: 'https://www.notion.com/careers',
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

function JobCard({
  job,
  isSelected,
  isApplied,
  onClick,
  onApply,
}: {
  job: Job;
  isSelected: boolean;
  isApplied: boolean;
  onClick: () => void;
  onApply: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition ${
        isSelected ? 'border-violet-500' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-white">{job.company}</div>
          <div className="text-sm text-slate-400">{job.role}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MatchBadge score={job.match} />
          {isApplied && (
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
        onClick={onApply}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition"
      >
        Apply →
      </button>
    </div>
  );
}

interface QAResult {
  question: string;
  answer: string;
}

interface SavedQA {
  results: QAResult[];
  savedAt: string;
}

const QA_STORAGE_KEY = 'jobpilot_qa_answers';

function loadAllQA(): Record<number, SavedQA> {
  try {
    const raw = localStorage.getItem(QA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveQAForJob(jobId: number, results: QAResult[]) {
  const all = loadAllQA();
  all[jobId] = { results, savedAt: new Date().toISOString() };
  localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(all));
}

function clearQAForJob(jobId: number) {
  const all = loadAllQA();
  delete all[jobId];
  localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(all));
}

export default function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [rightTab, setRightTab] = useState<'form' | 'questions'>('form');
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [appliedJobs, setAppliedJobs] = useState<Set<number>>(new Set());
  const [appliedFolderOpen, setAppliedFolderOpen] = useState(false);

  // Q&A state
  const [rawQuestions, setRawQuestions] = useState('');
  const [qaResults, setQaResults] = useState<QAResult[]>([]);
  const [qaSavedAt, setQaSavedAt] = useState<string | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState('');
  const [copiedAnswer, setCopiedAnswer] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // When selected job changes, load its saved Q&A (if any)
  useEffect(() => {
    if (!selectedJob) return;
    const all = loadAllQA();
    const saved = all[selectedJob.id];
    if (saved) {
      setQaResults(saved.results);
      setQaSavedAt(saved.savedAt);
      setRawQuestions('');
    } else {
      setQaResults([]);
      setQaSavedAt(null);
      setRawQuestions('');
    }
    setQaError('');
    setShowClearConfirm(false);
  }, [selectedJob?.id]);

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

  // Split into unapplied (primary) and applied (folder)
  const unappliedJobs = filteredJobs.filter((j) => !appliedJobs.has(j.id));
  const appliedFilteredJobs = filteredJobs.filter((j) => appliedJobs.has(j.id));

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
      // Load experience bank
      let experienceBank = [];
      try {
        const ebRaw = localStorage.getItem('jobpilot_experience_bank');
        experienceBank = ebRaw ? JSON.parse(ebRaw) : [];
      } catch {}

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
        saveQAForJob(selectedJob.id, combined);
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
    clearQAForJob(selectedJob.id);
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
    isApplied: appliedJobs.has(job.id),
    onClick: () => handleJobSelect(job),
    onApply: (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(job.jobPostingUrl || job.url, '_blank');
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
      <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] -m-4 md:-m-8">
        {/* Left panel */}
        <div className={`w-full md:w-[40%] border-r border-slate-800 flex flex-col overflow-hidden ${mobileShowDetail ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & filters */}
          <div className="p-5 border-b border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Job Board</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                {filteredJobs.length} {filteredJobs.length !== seedJobs.length ? `of ${seedJobs.length}` : 'jobs'}
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
                <option value="Remote">Remote</option>
                <option value="San Francisco">San Francisco</option>
                <option value="NYC">NYC</option>
                <option value="Seattle">Seattle</option>
                <option value="Mountain View">Mountain View</option>
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
            {/* Unapplied jobs — primary list */}
            {unappliedJobs.length === 0 && appliedFilteredJobs.length === 0 && (
              <div className="text-center text-slate-500 py-12 text-sm">No jobs match your search.</div>
            )}
            {unappliedJobs.length === 0 && appliedFilteredJobs.length > 0 && (
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
              <p className="text-slate-500 text-sm">Click "Apply" on any job card to see your pre-filled application.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Job header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">{selectedJob.company} — {selectedJob.role}</h2>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 text-sm text-slate-400">
                    <span>{selectedJob.salary}</span>
                    <span>·</span>
                    <span>{selectedJob.location}</span>
                    <span>·</span>
                    <MatchBadge score={selectedJob.match} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-start md:items-end">
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
                      onClick={() => { setSelectedJob(null); setMobileShowDetail(false); }}
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

              {/* Why this role */}
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
