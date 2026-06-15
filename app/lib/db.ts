import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────

export interface Profile {
  fullName?: string;
  currentTitle?: string;
  yearsExperience?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  workExperience?: string;
  topSkills?: string;
  differentiation?: string;
  sideProjects?: string;
  targetCompensation?: string;
  targetRoles?: string[];
  workStyle?: string[];
  specialRequests?: string;
  tier?: string;
}

export interface ResumeReport {
  revisedText: string;
  appliedCount: number;
  approvedSuggestions: unknown[];
  savedAt: string;
}

export interface ExperienceEntry {
  id?: string;
  question: string;
  answer: string;
  tags: string[];
  source?: string;
  sortOrder?: number;
}

export interface MarketReport {
  bestFitRoles: unknown[];
  targetCompanyTypes: unknown[];
  marketFitScore: number;
  linkedinAdvice: unknown[];
  experienceQuestions: unknown[];
}

// ── Field mapping helpers ────────────────────────────────────────────────

function profileToDb(p: Profile) {
  return {
    full_name: p.fullName ?? null,
    current_title: p.currentTitle ?? null,
    years_experience: p.yearsExperience ?? null,
    location: p.location ?? null,
    linkedin_url: p.linkedinUrl ?? null,
    portfolio_url: p.portfolioUrl ?? null,
    github_url: p.githubUrl ?? null,
    work_experience: p.workExperience ?? null,
    top_skills: p.topSkills ?? null,
    differentiation: p.differentiation ?? null,
    side_projects: p.sideProjects ?? null,
    target_compensation: p.targetCompensation ?? null,
    target_roles: p.targetRoles ?? [],
    work_style: p.workStyle ?? [],
    special_requests: p.specialRequests ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToProfile(row: any): Profile {
  return {
    fullName: row.full_name ?? '',
    currentTitle: row.current_title ?? '',
    yearsExperience: row.years_experience ?? '',
    location: row.location ?? '',
    linkedinUrl: row.linkedin_url ?? '',
    portfolioUrl: row.portfolio_url ?? '',
    githubUrl: row.github_url ?? '',
    workExperience: row.work_experience ?? '',
    topSkills: row.top_skills ?? '',
    differentiation: row.differentiation ?? '',
    sideProjects: row.side_projects ?? '',
    targetCompensation: row.target_compensation ?? '',
    targetRoles: row.target_roles ?? [],
    workStyle: row.work_style ?? [],
    specialRequests: row.special_requests ?? '',
    tier: row.tier ?? 'free',
  };
}

// ── Profile ──────────────────────────────────────────────────────────────

export async function getProfile(supabase: SupabaseClient | null): Promise<Profile | null> {
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').single();
    return data ? dbToProfile(data) : null;
  }
  const raw = localStorage.getItem('jobpilot_profile');
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(supabase: SupabaseClient | null, profile: Profile): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update(profileToDb(profile)).eq('id', user.id);
      return; // Don't write to localStorage when using Supabase
    }
  }
  // Only write to localStorage for anonymous users
  localStorage.setItem('jobpilot_profile', JSON.stringify(profile));
}

// ── Resume Report ────────────────────────────────────────────────────────

export async function getResumeReport(supabase: SupabaseClient | null): Promise<ResumeReport | null> {
  if (supabase) {
    const { data } = await supabase.from('resume_reports').select('*').single();
    if (data) {
      return {
        revisedText: data.revised_text,
        appliedCount: data.applied_count,
        approvedSuggestions: data.approved_suggestions,
        savedAt: data.saved_at,
      };
    }
    return null;
  }
  const raw = localStorage.getItem('jobpilot_resume_report');
  return raw ? JSON.parse(raw) : null;
}

export async function saveResumeReport(supabase: SupabaseClient | null, report: ResumeReport): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('resume_reports').upsert({
        user_id: user.id,
        revised_text: report.revisedText,
        applied_count: report.appliedCount,
        approved_suggestions: report.approvedSuggestions,
        saved_at: report.savedAt,
      }, { onConflict: 'user_id' });
      return;
    }
  }
  localStorage.setItem('jobpilot_resume_report', JSON.stringify(report));
}

// ── Experience Bank ──────────────────────────────────────────────────────

export async function getExperienceEntries(supabase: SupabaseClient | null): Promise<ExperienceEntry[]> {
  if (supabase) {
    const { data } = await supabase
      .from('experience_entries')
      .select('*')
      .order('sort_order', { ascending: true });
    return (data ?? []).map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      tags: row.tags ?? [],
      source: row.source,
      sortOrder: row.sort_order,
    }));
  }
  const raw = localStorage.getItem('jobpilot_experience_bank');
  return raw ? JSON.parse(raw) : [];
}

export async function saveExperienceEntries(supabase: SupabaseClient | null, entries: ExperienceEntry[]): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Delete existing and re-insert (simple approach for ordered lists)
      await supabase.from('experience_entries').delete().eq('user_id', user.id);
      if (entries.length > 0) {
        await supabase.from('experience_entries').insert(
          entries.map((e, i) => ({
            user_id: user.id,
            question: e.question,
            answer: e.answer,
            tags: e.tags,
            source: e.source ?? 'user',
            sort_order: i,
          }))
        );
      }
      return;
    }
  }
  localStorage.setItem('jobpilot_experience_bank', JSON.stringify(entries));
}

// ── Market Report ────────────────────────────────────────────────────────

export async function getMarketReport(supabase: SupabaseClient | null): Promise<MarketReport | null> {
  if (supabase) {
    const { data } = await supabase.from('market_reports').select('*').single();
    if (data) {
      return {
        bestFitRoles: data.best_fit_roles,
        targetCompanyTypes: data.target_company_types,
        marketFitScore: data.market_fit_score,
        linkedinAdvice: data.linkedin_advice,
        experienceQuestions: data.experience_questions,
      };
    }
    return null;
  }
  const raw = localStorage.getItem('jobpilot_market_report');
  return raw ? JSON.parse(raw) : null;
}

export async function saveMarketReport(supabase: SupabaseClient | null, report: MarketReport): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('market_reports').upsert({
        user_id: user.id,
        best_fit_roles: report.bestFitRoles,
        target_company_types: report.targetCompanyTypes,
        market_fit_score: report.marketFitScore,
        linkedin_advice: report.linkedinAdvice,
        experience_questions: report.experienceQuestions,
      }, { onConflict: 'user_id' });
      return;
    }
  }
  localStorage.setItem('jobpilot_market_report', JSON.stringify(report));
}

// ── QA Answers ───────────────────────────────────────────────────────────

export async function getQAAnswers(supabase: SupabaseClient | null): Promise<{ question: string; answer: string }[]> {
  if (supabase) {
    const { data } = await supabase
      .from('qa_answers')
      .select('question, answer')
      .order('created_at', { ascending: true });
    return data ?? [];
  }
  const raw = localStorage.getItem('jobpilot_qa_answers');
  return raw ? JSON.parse(raw) : [];
}

export async function saveQAAnswers(supabase: SupabaseClient | null, answers: { question: string; answer: string }[]): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('qa_answers').delete().eq('user_id', user.id);
      if (answers.length > 0) {
        await supabase.from('qa_answers').insert(
          answers.map((a) => ({ user_id: user.id, question: a.question, answer: a.answer }))
        );
      }
      return;
    }
  }
  localStorage.setItem('jobpilot_qa_answers', JSON.stringify(answers));
}

// ── Jobs ────────────────────────────────────────────────────────────────

export interface JobListing {
  id?: string;
  company: string;
  role: string;
  salary?: string;
  location?: string;
  url?: string;
  jobPostingUrl?: string;
  notes?: string;
  matchScore?: number;
  companyOutlook?: string;
  compatibility?: string;
  postedDate?: string;
  createdAt?: string;
}

export async function getJobs(supabase: SupabaseClient | null): Promise<JobListing[]> {
  if (supabase) {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      company: row.company,
      role: row.role,
      salary: row.salary ?? '',
      location: row.location ?? '',
      url: row.url ?? '',
      jobPostingUrl: row.job_posting_url ?? '',
      notes: row.notes ?? '',
      matchScore: row.match_score,
      companyOutlook: row.company_outlook ?? '',
      compatibility: row.compatibility ?? '',
      postedDate: row.posted_date ?? '',
      createdAt: row.created_at,
    }));
  }
  const raw = localStorage.getItem('jobpilot_jobs');
  return raw ? JSON.parse(raw) : [];
}

export async function saveJob(supabase: SupabaseClient | null, job: JobListing): Promise<JobListing> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const row = {
        user_id: user.id,
        company: job.company,
        role: job.role,
        salary: job.salary ?? null,
        location: job.location ?? null,
        url: job.url ?? null,
        job_posting_url: job.jobPostingUrl ?? null,
        notes: job.notes ?? null,
        match_score: job.matchScore ?? null,
        company_outlook: job.companyOutlook ?? null,
        compatibility: job.compatibility ?? null,
        posted_date: job.postedDate ?? null,
      };
      if (job.id) {
        const { data } = await supabase.from('jobs').update(row).eq('id', job.id).eq('user_id', user.id).select().single();
        return data ? { ...job, id: data.id } : job;
      } else {
        const { data } = await supabase.from('jobs').insert(row).select().single();
        return data ? { ...job, id: data.id } : job;
      }
    }
  }
  // localStorage fallback
  const existing = JSON.parse(localStorage.getItem('jobpilot_jobs') || '[]');
  if (job.id) {
    const idx = existing.findIndex((j: JobListing) => j.id === job.id);
    if (idx >= 0) existing[idx] = job;
  } else {
    job.id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    job.createdAt = new Date().toISOString();
    existing.unshift(job);
  }
  localStorage.setItem('jobpilot_jobs', JSON.stringify(existing));
  return job;
}

export async function deleteJob(supabase: SupabaseClient | null, jobId: string): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('jobs').delete().eq('id', jobId).eq('user_id', user.id);
    }
  }
  const existing = JSON.parse(localStorage.getItem('jobpilot_jobs') || '[]');
  const filtered = existing.filter((j: JobListing) => j.id !== jobId);
  localStorage.setItem('jobpilot_jobs', JSON.stringify(filtered));
}

// ── Clear all derived data (on new resume upload) ────────────────────────

export async function clearDerivedData(supabase: SupabaseClient | null): Promise<void> {
  if (supabase) {
    // For auth users, the DB trigger handles this automatically when
    // work_experience is updated. But we also clear localStorage cache.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await Promise.all([
        supabase.from('resume_reports').delete().eq('user_id', user.id),
        supabase.from('experience_entries').delete().eq('user_id', user.id).eq('source', 'ai'),
        supabase.from('market_reports').delete().eq('user_id', user.id),
        supabase.from('qa_answers').delete().eq('user_id', user.id),
      ]);
    }
  }
  // Always clear localStorage cache
  localStorage.removeItem('jobpilot_resume_report');
  localStorage.removeItem('jobpilot_experience_bank');
  localStorage.removeItem('jobpilot_market_report');
  localStorage.removeItem('jobpilot_analysis');
  localStorage.removeItem('jobpilot_qa_answers');
}

// ── Clear ALL data (settings page "delete everything") ───────────────────

export async function clearAllData(supabase: SupabaseClient | null): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await Promise.all([
        supabase.from('resume_reports').delete().eq('user_id', user.id),
        supabase.from('experience_entries').delete().eq('user_id', user.id),
        supabase.from('market_reports').delete().eq('user_id', user.id),
        supabase.from('jobs').delete().eq('user_id', user.id),
        supabase.from('applications').delete().eq('user_id', user.id),
        supabase.from('qa_answers').delete().eq('user_id', user.id),
        supabase.from('ai_usage').delete().eq('user_id', user.id),
      ]);
      // Reset profile fields but keep the row
      await supabase.from('profiles').update({
        full_name: null, current_title: null, years_experience: null,
        location: null, linkedin_url: null, portfolio_url: null,
        github_url: null, work_experience: null, top_skills: null,
        differentiation: null, side_projects: null, target_compensation: null,
        target_roles: [], work_style: [], special_requests: null,
      }).eq('id', user.id);
    }
  }
  // Clear all localStorage keys
  localStorage.removeItem('jobpilot_profile');
  localStorage.removeItem('jobpilot_resume_report');
  localStorage.removeItem('jobpilot_experience_bank');
  localStorage.removeItem('jobpilot_market_report');
  localStorage.removeItem('jobpilot_applications');
  localStorage.removeItem('jobpilot_applied');
  localStorage.removeItem('jobpilot_jobs');
  localStorage.removeItem('jobpilot_analysis');
  localStorage.removeItem('jobpilot_qa_answers');
}

// ── Applications ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getApplications(supabase: SupabaseClient | null): Promise<any[]> {
  if (supabase) {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .order('applied_at', { ascending: false });
    return (data ?? []).map((row) => ({
      id: row.id,
      jobTitle: row.job_title,
      company: row.company,
      status: row.status,
      appliedAt: row.applied_at,
      notes: row.notes,
    }));
  }
  const raw = localStorage.getItem('jobpilot_applications');
  return raw ? JSON.parse(raw) : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveApplications(supabase: SupabaseClient | null, apps: any[]): Promise<void> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('applications').delete().eq('user_id', user.id);
      if (apps.length > 0) {
        await supabase.from('applications').insert(
          apps.map((a) => ({
            user_id: user.id,
            job_title: a.jobTitle,
            company: a.company,
            status: a.status ?? 'applied',
            applied_at: a.appliedAt ?? new Date().toISOString(),
            notes: a.notes ?? '',
          }))
        );
      }
      return;
    }
  }
  localStorage.setItem('jobpilot_applications', JSON.stringify(apps));
}

export async function getAppliedJobIds(supabase: SupabaseClient | null): Promise<string[]> {
  if (supabase) {
    const { data } = await supabase
      .from('applications')
      .select('job_title, company');
    // Return composite IDs to match against seed jobs
    return (data ?? []).map((row) => `${row.job_title}__${row.company}`);
  }
  const raw = localStorage.getItem('jobpilot_applied');
  return raw ? JSON.parse(raw) : [];
}

// ── AI Usage (rate limiting) ─────────────────────────────────────────────

export async function getTodayUsageCount(supabase: SupabaseClient): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());
  return count ?? 0;
}

export async function recordAIUsage(supabase: SupabaseClient, actionType: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('ai_usage').insert({ user_id: user.id, action_type: actionType });
  }
}

export async function getUserTier(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.from('profiles').select('tier').single();
  return data?.tier ?? 'free';
}
