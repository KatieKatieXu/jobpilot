'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';

interface Profile {
  fullName?: string;
  currentTitle?: string;
  location?: string;
  yearsExperience?: string;
  workStyle?: string | string[];
  targetRoles?: string[];
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  topSkills?: string;
  differentiation?: string;
  workExperience?: string;
  targetCompensation?: string;
}

interface Application {
  id: number;
  company: string;
  role: string;
  date: string;
  status: string;
}

interface ActivityItem {
  text: string;
  time: string;
  icon: string;
  ts: number;
}

// Calculate profile completeness as a %
function calcProfileStrength(p: Profile): number {
  const fields: (keyof Profile)[] = [
    'fullName', 'currentTitle', 'location', 'yearsExperience',
    'linkedinUrl', 'portfolioUrl', 'topSkills', 'differentiation',
    'workExperience', 'targetCompensation',
  ];
  const filled = fields.filter((f) => {
    const v = p[f];
    return v && (typeof v === 'string' ? v.trim().length > 0 : (v as string[]).length > 0);
  }).length;
  // Also count targetRoles and workStyle
  const extra =
    (p.targetRoles && p.targetRoles.length > 0 ? 1 : 0) +
    (p.workStyle && (Array.isArray(p.workStyle) ? p.workStyle.length > 0 : p.workStyle.length > 0) ? 1 : 0);
  return Math.round(((filled + extra) / (fields.length + 2)) * 100);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

// Total number of curated jobs in the board
const TOTAL_JOBS = 13;

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [appliedCount, setAppliedCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [profileStrength, setProfileStrength] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [hasMarket, setHasMarket] = useState(false);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    // Profile
    const savedProfile = localStorage.getItem('jobpilot_profile');
    let p: Profile = {};
    if (savedProfile) {
      try { p = JSON.parse(savedProfile); } catch {}
    }
    setProfile(p);
    setProfileStrength(calcProfileStrength(p));

    // Applied jobs (Set)
    const savedApplied = localStorage.getItem('jobpilot_applied');
    let appliedIds: number[] = [];
    if (savedApplied) {
      try { appliedIds = JSON.parse(savedApplied); } catch {}
    }
    setAppliedCount(appliedIds.length);

    // Applications board (for status breakdown)
    const savedApps = localStorage.getItem('jobpilot_applications');
    let apps: Application[] = [];
    if (savedApps) {
      try { apps = JSON.parse(savedApps); } catch {}
    }
    setInterviewCount(apps.filter((a) => a.status === 'interviewing').length);
    setOfferCount(apps.filter((a) => a.status === 'offer').length);

    // Market & resume reports
    setHasMarket(!!localStorage.getItem('jobpilot_market_report'));
    setHasResume(!!localStorage.getItem('jobpilot_resume_report'));

    // Build activity feed from real data
    const items: ActivityItem[] = [];

    // Applied jobs → activity entries
    apps.forEach((app) => {
      const ts = new Date(app.date).getTime();
      items.push({
        text: `Applied to ${app.role} at ${app.company}`,
        time: timeAgo(app.date),
        icon: '📤',
        ts,
      });
      if (app.status === 'interviewing') {
        items.push({
          text: `Interview scheduled: ${app.role} at ${app.company}`,
          time: timeAgo(app.date),
          icon: '📞',
          ts: ts + 1,
        });
      }
      if (app.status === 'offer') {
        items.push({
          text: `Offer received: ${app.role} at ${app.company} 🎉`,
          time: timeAgo(app.date),
          icon: '🏆',
          ts: ts + 2,
        });
      }
    });

    // Resume report
    const resumeRaw = localStorage.getItem('jobpilot_resume_report');
    if (resumeRaw) {
      try {
        const r = JSON.parse(resumeRaw);
        const ts = new Date(r.savedAt).getTime();
        items.push({
          text: `Resume revised — ${r.appliedCount} AI improvements applied`,
          time: timeAgo(r.savedAt),
          icon: '📄',
          ts,
        });
      } catch {}
    }

    // Market report
    const marketRaw = localStorage.getItem('jobpilot_market_report');
    if (marketRaw) {
      try {
        const m = JSON.parse(marketRaw);
        const ts = new Date(m.savedAt).getTime();
        const approved = (m.actions || []).filter((a: { status: string }) => a.status === 'approved').length;
        items.push({
          text: `Market analysis complete — ${approved} recommendations approved`,
          time: timeAgo(m.savedAt),
          icon: '📊',
          ts,
        });
      } catch {}
    }

    // Profile creation
    if (savedProfile) {
      items.push({
        text: p.fullName ? `Profile saved for ${p.fullName}` : 'Profile created',
        time: '',
        icon: '✅',
        ts: 0,
      });
    }

    // Sort newest first, show top 6
    items.sort((a, b) => b.ts - a.ts);
    setActivity(items.slice(0, 6));
  }, []);

  const jobsAvailable = TOTAL_JOBS - appliedCount;

  const statCards = [
    { label: 'Jobs Available', value: String(jobsAvailable), icon: '💼', color: 'text-violet-400', href: '/jobs' },
    { label: 'Applications', value: String(appliedCount), icon: '📤', color: 'text-blue-400', href: '/applications' },
    { label: 'Interviews', value: String(interviewCount), icon: '📞', color: 'text-green-400', href: '/applications' },
    { label: 'Profile', value: `${profileStrength}%`, icon: '⚡', color: profileStrength >= 80 ? 'text-green-400' : profileStrength >= 50 ? 'text-yellow-400' : 'text-red-400', href: '/profile' },
  ];

  const workStyleDisplay = Array.isArray(profile.workStyle)
    ? profile.workStyle.join(', ')
    : profile.workStyle;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile.fullName ? `Welcome back, ${profile.fullName.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening with your job search.</p>
        </div>

        {/* Profile summary card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-2xl font-bold text-violet-300">
            {profile.fullName ? profile.fullName[0] : '👤'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">{profile.fullName || 'Your Name'}</h2>
            <p className="text-slate-400 text-sm">{profile.currentTitle || 'Add your title'}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
              {profile.location && <span>📍 {profile.location}</span>}
              {profile.yearsExperience && <span>🗓 {profile.yearsExperience} yrs exp</span>}
              {workStyleDisplay && <span>🏠 {workStyleDisplay}</span>}
              {profile.targetCompensation && <span>💰 {profile.targetCompensation}</span>}
            </div>
            {/* Profile strength bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    profileStrength >= 80 ? 'bg-green-500' : profileStrength >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${profileStrength}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{profileStrength}% complete</span>
            </div>
          </div>
          <Link href="/profile" className="text-violet-400 hover:text-violet-300 text-sm font-medium transition shrink-0">
            Edit Profile →
          </Link>
        </div>

        {/* Workflow diagram — horizontal main flow with feedback loops */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          
          {/* Main horizontal row: Profile (with Stories/Resume) → Market → Apply → Interview */}
          <div className="flex items-center justify-center gap-6">
            
            {/* Profile panel containing Stories, Profile, Resume */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
              <div className="flex flex-col items-center gap-2">
                {/* Stories */}
                <Link href="/stories" className="group">
                  <div className="w-24 py-2 rounded-lg border-2 border-dashed bg-slate-800/40 border-violet-500/50 hover:border-violet-400 text-center transition">
                    <span className="text-base">📖</span>
                    <p className="text-xs font-medium text-violet-300">Stories</p>
                  </div>
                </Link>
                
                {/* Recycle circle connector */}
                <div className="text-violet-500/70 text-lg">↻</div>
                
                {/* Profile (main node) */}
                <Link href="/profile" className="group">
                  <div className={`w-32 py-4 rounded-xl border-2 text-center transition ${
                    profileStrength >= 70 ? 'bg-green-500/10 border-green-500/50' : 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/20'
                  }`}>
                    <span className="text-2xl">{profileStrength >= 70 ? '✓' : '👤'}</span>
                    <p className={`text-sm font-semibold mt-1 ${profileStrength >= 70 ? 'text-green-400' : 'text-violet-300'}`}>Profile</p>
                  </div>
                </Link>
                
                {/* Recycle circle connector */}
                <div className="text-violet-500/70 text-lg">↻</div>
                
                {/* Resume */}
                <Link href="/resume" className="group">
                  <div className={`w-24 py-2 rounded-lg border-2 border-dashed text-center transition ${
                    hasResume ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-800/40 border-violet-500/50 hover:border-violet-400'
                  }`}>
                    <span className="text-base">{hasResume ? '✓' : '📄'}</span>
                    <p className="text-xs font-medium text-violet-300">Resume</p>
                  </div>
                </Link>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="text-violet-500 text-2xl self-center">→</div>
            
            {/* Market */}
            <Link href="/market" className="group self-center">
              <div className={`w-32 py-4 rounded-xl border-2 text-center transition ${
                hasMarket ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-800/80 border-slate-700 hover:border-violet-500'
              }`}>
                <span className="text-2xl">{hasMarket ? '✓' : '📈'}</span>
                <p className="text-sm font-semibold text-slate-300 mt-1">Market</p>
              </div>
            </Link>
            
            {/* Arrow */}
            <div className="text-violet-500 text-2xl self-center">→</div>
            
            {/* Apply */}
            <Link href="/jobs" className="group self-center">
              <div className={`w-32 py-4 rounded-xl border-2 text-center transition ${
                appliedCount > 0 ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-800/80 border-slate-700 hover:border-violet-500'
              }`}>
                <span className="text-2xl">{appliedCount > 0 ? '✓' : '💼'}</span>
                <p className="text-sm font-semibold text-slate-300 mt-1">Apply</p>
              </div>
            </Link>
            
            {/* Arrow */}
            <div className="text-violet-500 text-2xl self-center">→</div>
            
            {/* Interview */}
            <Link href="/applications" className="group self-center">
              <div className="w-32 py-4 rounded-xl border-2 bg-slate-800/80 border-slate-700 hover:border-violet-500 text-center transition">
                <span className="text-2xl">🎯</span>
                <p className="text-sm font-semibold text-slate-300 mt-1">Interview</p>
              </div>
            </Link>
            
          </div>
          
          {/* Bottom label */}
          <div className="text-center mt-6">
            <p className="text-xs text-slate-500">
              Every update to <span className="text-violet-400">Stories</span> & <span className="text-violet-400">Resume</span> strengthens your Profile
            </p>
          </div>
          
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
            >
              <div className={`text-2xl font-bold ${stat.color} mb-1 group-hover:scale-105 transition-transform`}>
                {stat.value}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>{stat.icon}</span>
                {stat.label}
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
            {activity.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <p>No activity yet.</p>
                <Link href="/jobs" className="text-violet-400 hover:text-violet-300 mt-2 inline-block">Browse jobs to get started →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">{item.text}</p>
                      {item.time && <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/jobs" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                <span className="text-xl">🔍</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Browse Jobs</p>
                  <p className="text-xs text-slate-500">{TOTAL_JOBS} curated matches</p>
                </div>
              </Link>
              <Link href="/resume" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                <span className="text-xl">📄</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{hasResume ? 'View Resume Report' : 'Revise Resume'}</p>
                  <p className="text-xs text-slate-500">{hasResume ? 'Last report saved' : 'AI-powered optimization'}</p>
                </div>
              </Link>
              <Link href="/market" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{hasMarket ? 'View Market Analysis' : 'Run Market Analysis'}</p>
                  <p className="text-xs text-slate-500">{hasMarket ? 'See your positioning' : 'Understand your market fit'}</p>
                </div>
              </Link>
              <Link href="/applications" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                <span className="text-xl">📋</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Track Applications</p>
                  <p className="text-xs text-slate-500">
                    {appliedCount > 0 ? `${appliedCount} in pipeline` : 'Kanban board'}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Offer banner */}
        {offerCount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-white font-semibold">You have {offerCount} offer{offerCount > 1 ? 's' : ''}!</p>
              <p className="text-slate-400 text-sm mt-0.5">Congratulations — head to your applications board to review.</p>
            </div>
            <Link href="/applications" className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition">
              View Offers →
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
