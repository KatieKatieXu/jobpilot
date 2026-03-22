'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ResumeUpload from '@/components/ResumeUpload';

const ROLE_TYPES = [
  'Senior Designer',
  'Staff Designer',
  'Principal',
  'AI UX',
  'PM',
  'Head of Design',
  'Other',
];

const WORK_STYLES = ['Remote', 'Hybrid', 'On-site'];

interface ProfileData {
  fullName: string;
  currentTitle: string;
  yearsExperience: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string;
  workExperience: string;
  topSkills: string;
  differentiation: string;
  sideProjects: string;
  targetCompensation: string;
  targetRoles: string[];
  workStyle: string[];
  specialRequests: string;
  openToRelocation: string;
}

const defaultProfile: ProfileData = {
  fullName: 'Katie Xu',
  currentTitle: 'VP & Design Lead',
  yearsExperience: '7',
  location: 'New York, NY',
  linkedinUrl: 'https://linkedin.com/in/katherinexu99',
  portfolioUrl: 'https://www.katexu.com',
  githubUrl: 'https://github.com/KatieKatieXu',
  workExperience: `Bank of America — VP & Design Lead (Feb 2023–Present)
Led 2 designers; reduced avg order submission time 40%, decreased support tickets 20% by optimizing complex cloud platform workflows. Initiated portal interface redesign; built strategic interaction design with cross-functional teams.

Little Red Book — Asst. VP & UX Designer (Dec 2020–Aug 2021)
100% of users found renewed design helpful. Cloud hosting apps grew 200→1000+. Built design systems across platform.

pawpawStory — UX Designer (Jun 2018–Dec 2020)
NPS increased 5→36 by redesigning ordering process. User base grew 200%+ in first quarter after redesign.

pawpawStory — Solo AI Product Builder (Dec 2025–Present)
0→App Store in 4 weeks. iOS AI storytelling app for kids using ElevenLabs voice cloning + LLMs. Figma→Cursor MCP multi-agent workflow.

Gen AI Product Design Creator (Jan 2026–Present)
10,000+ active interactions in 3 weeks. Content on AI workflows, Vibe Coding, AI-native product building.

ionboard — Design & Marketing Lead (Aug 2017–Sept 2018)
Kickstarter: $57,132 raised in 24hrs. 1st place UCSD The Basement pitch. CES 2018 exhibitor.`,
  topSkills: 'AI-native product design, Design systems, User research & strategy',
  differentiation: `Rare combination of 7+ years enterprise UX (Bank of America scale) + solo AI product builder (shipped iOS app in 4 weeks). I bridge design craft with technical execution using AI tools — Figma to production via Cursor MCP, voice cloning, LLM integration. Cognitive science background + bilingual (EN/ZH) gives me deep empathy for diverse user bases.`,
  sideProjects: `Solo AI Product Builder — 4 products shipped (Dec 2025–Present):

• Jobpilot (Mar 2026): AI job hunting tool — resume AI revision, job matching by interview probability, form auto-fill, tracker. Next.js + Claude API + Figma→Cursor MCP.

• OneCo (Mar 2026): One-person company personality quiz — 10Q talent profiler, 4-language i18n (EN/ZH/ES/FR), funnels to Jobpilot. Built as 小红书 content-to-product funnel.

• Mission Control (Mar 2026): Personal AI agent command center — live animated pixel-art office, subagent management, cron jobs, memory viewer. Next.js + OpenClaw runtime.

• katexu.com (2025–2026): Interactive space-themed portfolio — 3D card effects, Framer Motion, case studies. Built with Figma MCP + Cursor.

• pawpawStory (Dec 2025): iOS AI storytelling app for kids — 0→App Store in 4 weeks. React Native + ElevenLabs voice cloning + LLM.

ionboard: Electric skateboard startup — Kickstarter $57K in 24hrs, CES 2018, UCSD Accelerator
Gen AI Creator: 10K+ community interactions in 3 weeks
Awards: Grace Hopper 2018 Co-Speaker, Be the Change Leadership Award`,
  targetCompensation: '$190K+ base',
  targetRoles: ['Senior Designer', 'Staff Designer', 'Principal', 'AI UX'],
  workStyle: ['Hybrid'],
  specialRequests: 'AI-native companies preferred. Open to startups with strong product vision.',
  openToRelocation: 'no',
};

// Detect if profile looks meaningfully filled (beyond the bare defaults)
function isProfileSaved(p: ProfileData | null): p is ProfileData {
  if (!p) return false;
  return !!(p.fullName && p.currentTitle);
}

export default function ProfilePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'summary' | 'edit'>('edit');
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('jobpilot_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultProfile, ...parsed };
        setProfile(merged);
        if (isProfileSaved(merged)) {
          setHasExistingProfile(true);
          setViewMode('summary');
        }
      } catch {}
    }
  }, []);

  const update = (field: keyof ProfileData, value: string | string[]) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const toggleRole = (role: string) => {
    const roles = profile.targetRoles.includes(role)
      ? profile.targetRoles.filter((r) => r !== role)
      : [...profile.targetRoles, role];
    update('targetRoles', roles);
  };

  const handleResumeParsed = (text: string, extracted: { [key: string]: string | undefined }) => {
    setProfile((p) => ({
      ...p,
      fullName: extracted.name || p.fullName,
      linkedinUrl: extracted.linkedin || p.linkedinUrl,
      githubUrl: extracted.github || p.githubUrl,
      portfolioUrl: extracted.website || p.portfolioUrl,
      workExperience: text || p.workExperience,
    }));
  };

  const handleSave = () => {
    localStorage.setItem('jobpilot_profile', JSON.stringify(profile));
    setHasExistingProfile(true);
    setViewMode('summary');
  };

  const handleFinish = () => {
    localStorage.setItem('jobpilot_profile', JSON.stringify(profile));
    setHasExistingProfile(true);
    setViewMode('summary');
    router.push('/dashboard');
  };

  const clearProfile = () => {
    localStorage.removeItem('jobpilot_profile');
    setProfile(defaultProfile);
    setHasExistingProfile(false);
    setViewMode('edit');
    setStep(1);
    setShowClearConfirm(false);
  };

  const inputClass =
    'w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition text-sm';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';

  // ── Summary view for returning users ─────────────────────────────────────
  if (viewMode === 'summary') {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Profile</h1>
              <p className="text-slate-400 mt-1">Looking good — your profile is saved and ready.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setViewMode('edit'); setStep(1); }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition"
              >
                ✏️ Edit Profile
              </button>
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Sure?</span>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                  >No</button>
                  <button
                    onClick={clearProfile}
                    className="text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition"
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
            </div>
          </div>

          <div className="space-y-4">
            {/* Identity card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">About You</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Name</p>
                  <p className="text-white font-medium">{profile.fullName || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Title</p>
                  <p className="text-white">{profile.currentTitle || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Experience</p>
                  <p className="text-white">{profile.yearsExperience ? `${profile.yearsExperience} years` : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Location</p>
                  <p className="text-white">{profile.location || '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 transition text-xs">
                    🔗 LinkedIn
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 transition text-xs">
                    🌐 Portfolio
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 transition text-xs">
                    🐙 GitHub
                  </a>
                )}
              </div>
            </div>

            {/* Background card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Background</h2>
              <div className="space-y-4 text-sm">
                {profile.topSkills && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Top Skills</p>
                    <p className="text-slate-200">{profile.topSkills}</p>
                  </div>
                )}
                {profile.differentiation && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">What Makes You Different</p>
                    <p className="text-slate-200 leading-relaxed">{profile.differentiation}</p>
                  </div>
                )}
                {profile.workExperience && (
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Work Experience</p>
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono leading-relaxed bg-slate-800/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {profile.workExperience}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Goals card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Goals</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Target Compensation</p>
                  <p className="text-white font-medium">{profile.targetCompensation || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Work Style</p>
                  <p className="text-white">{Array.isArray(profile.workStyle) ? profile.workStyle.join(', ') : profile.workStyle || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Open to Relocation</p>
                  <p className="text-white capitalize">{profile.openToRelocation || '—'}</p>
                </div>
              </div>
              {profile.targetRoles?.length > 0 && (
                <div className="mt-4">
                  <p className="text-slate-500 text-xs mb-2">Target Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.targetRoles.map((r) => (
                      <span key={r} className="px-2.5 py-1 bg-violet-600/20 border border-violet-600/30 text-violet-300 text-xs rounded-lg">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {profile.specialRequests && (
                <div className="mt-4">
                  <p className="text-slate-500 text-xs mb-1">Special Requests</p>
                  <p className="text-slate-300 text-sm">{profile.specialRequests}</p>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setViewMode('edit'); setStep(1); }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium rounded-xl transition"
              >
                ✏️ Edit Profile
              </button>
              <button
                onClick={() => router.push('/jobs')}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition"
              >
                Browse Jobs →
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Edit / setup flow ─────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Profile</h1>
            <p className="text-slate-400 mt-1">Tell us about yourself so we can find the best matches.</p>
          </div>
          {hasExistingProfile && (
            <button
              onClick={() => setViewMode('summary')}
              className="text-sm text-slate-400 hover:text-violet-400 transition"
            >
              ← Back to summary
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <button
                onClick={() => s < step && setStep(s)}
                className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center transition ${
                  s === step
                    ? 'bg-violet-600 text-white'
                    : s < step
                    ? 'bg-violet-900 text-violet-300 cursor-pointer hover:bg-violet-800'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {s < step ? '✓' : s}
              </button>
              <span className={`text-sm ${s === step ? 'text-white font-medium' : 'text-slate-500'}`}>
                {s === 1 ? 'About You' : s === 2 ? 'Background' : 'Goals'}
              </span>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-violet-600' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-4">About You</h2>
              <ResumeUpload onParsed={handleResumeParsed} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input className={inputClass} placeholder="Katie Xu" value={profile.fullName} onChange={(e) => update('fullName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Current Title</label>
                  <input className={inputClass} placeholder="Senior UX Designer" value={profile.currentTitle} onChange={(e) => update('currentTitle', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Years of Experience</label>
                  <input className={inputClass} placeholder="7" value={profile.yearsExperience} onChange={(e) => update('yearsExperience', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input className={inputClass} placeholder="New York, NY" value={profile.location} onChange={(e) => update('location', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input className={inputClass} placeholder="https://linkedin.com/in/..." value={profile.linkedinUrl} onChange={(e) => update('linkedinUrl', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Portfolio / Website URL</label>
                <input className={inputClass} placeholder="https://..." value={profile.portfolioUrl} onChange={(e) => update('portfolioUrl', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>GitHub URL <span className="text-slate-500">(optional)</span></label>
                <input className={inputClass} placeholder="https://github.com/..." value={profile.githubUrl} onChange={(e) => update('githubUrl', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white mb-6">Your Background</h2>
              <div>
                <label className={labelClass}>Work Experience Summary</label>
                <textarea
                  className={inputClass + ' resize-none h-28'}
                  placeholder="Paste your resume or describe your background..."
                  value={profile.workExperience}
                  onChange={(e) => update('workExperience', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Top 3 Skills / Strengths</label>
                <input className={inputClass} placeholder="UX Research, Design Systems, AI Product Design" value={profile.topSkills} onChange={(e) => update('topSkills', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>What makes you different from other candidates?</label>
                <textarea
                  className={inputClass + ' resize-none h-24'}
                  placeholder="Your unique angle..."
                  value={profile.differentiation}
                  onChange={(e) => update('differentiation', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Side Projects / Notable Accomplishments</label>
                <textarea
                  className={inputClass + ' resize-none h-24'}
                  placeholder="Built X, shipped Y, won Z..."
                  value={profile.sideProjects}
                  onChange={(e) => update('sideProjects', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white mb-6">Your Goals</h2>
              <div>
                <label className={labelClass}>Target Compensation</label>
                <input className={inputClass} placeholder="$180K–$220K base" value={profile.targetCompensation} onChange={(e) => update('targetCompensation', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Target Role Types</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ROLE_TYPES.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        profile.targetRoles.includes(role)
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Work Style Preference <span className="text-slate-500 font-normal">(select all that apply)</span></label>
                <div className="flex gap-2 mt-2">
                  {WORK_STYLES.map((style) => {
                    const selected = Array.isArray(profile.workStyle)
                      ? profile.workStyle.includes(style)
                      : profile.workStyle === style;
                    const toggle = () => {
                      const current = Array.isArray(profile.workStyle) ? profile.workStyle : [profile.workStyle];
                      const next = current.includes(style)
                        ? current.filter((s) => s !== style)
                        : [...current, style];
                      update('workStyle', next);
                    };
                    return (
                      <button
                        key={style}
                        onClick={toggle}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                          selected
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>Special Requests</label>
                <textarea
                  className={inputClass + ' resize-none h-20'}
                  placeholder="Any specific requirements or preferences..."
                  value={profile.specialRequests}
                  onChange={(e) => update('specialRequests', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Open to Relocation?</label>
                <div className="flex gap-3 mt-2">
                  {['yes', 'no'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => update('openToRelocation', opt)}
                      className={`px-6 py-2 rounded-lg text-sm font-medium border transition capitalize ${
                        profile.openToRelocation === opt
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-606'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={() => step > 1 ? setStep((s) => s - 1) : setViewMode('summary')}
              className="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition"
            >
              {step > 1 ? '← Back' : hasExistingProfile ? '← Summary' : '← Back'}
            </button>
            <div className="flex gap-3">
              {/* Mid-flow save */}
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition"
              >
                Save
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition"
                >
                  Save Profile ✓
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
