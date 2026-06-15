import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * One-time migration: moves all localStorage data to Supabase
 * when a user signs in for the first time.
 * Only runs if the user's profile has no work_experience set.
 */
export async function migrateLocalStorageToSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Check if user already has data in Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('work_experience')
    .eq('id', userId)
    .single();

  // If they already have resume data, skip migration
  if (profile?.work_experience) return false;

  // Check if there's anything in localStorage to migrate
  const localProfile = localStorage.getItem('jobpilot_profile');
  if (!localProfile) return false;

  try {
    // 1. Migrate profile
    const p = JSON.parse(localProfile);
    await supabase.from('profiles').update({
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
    }).eq('id', userId);

    // 2. Migrate resume report
    const localReport = localStorage.getItem('jobpilot_resume_report');
    if (localReport) {
      const r = JSON.parse(localReport);
      await supabase.from('resume_reports').upsert({
        user_id: userId,
        revised_text: r.revisedText,
        applied_count: r.appliedCount ?? 0,
        approved_suggestions: r.approvedSuggestions ?? [],
        saved_at: r.savedAt ?? new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    // 3. Migrate experience bank
    const localStories = localStorage.getItem('jobpilot_experience_bank');
    if (localStories) {
      const entries = JSON.parse(localStories);
      if (Array.isArray(entries) && entries.length > 0) {
        await supabase.from('experience_entries').insert(
          entries.map((e: { question: string; answer: string; tags?: string[] }, i: number) => ({
            user_id: userId,
            question: e.question,
            answer: e.answer,
            tags: e.tags ?? [],
            source: 'user',
            sort_order: i,
          }))
        );
      }
    }

    // 4. Migrate market report
    const localMarket = localStorage.getItem('jobpilot_market_report');
    if (localMarket) {
      const m = JSON.parse(localMarket);
      await supabase.from('market_reports').upsert({
        user_id: userId,
        best_fit_roles: m.bestFitRoles ?? [],
        target_company_types: m.targetCompanyTypes ?? [],
        market_fit_score: m.marketFitScore ?? 0,
        linkedin_advice: m.linkedinAdvice ?? [],
        experience_questions: m.experienceQuestions ?? [],
      }, { onConflict: 'user_id' });
    }

    // 5. Migrate QA answers
    const localQA = localStorage.getItem('jobpilot_qa_answers');
    if (localQA) {
      const answers = JSON.parse(localQA);
      if (Array.isArray(answers) && answers.length > 0) {
        await supabase.from('qa_answers').insert(
          answers.map((a: { question: string; answer: string }) => ({
            user_id: userId,
            question: a.question,
            answer: a.answer,
          }))
        );
      }
    }

    // 6. Migrate applications
    const localApps = localStorage.getItem('jobpilot_applications');
    if (localApps) {
      const apps = JSON.parse(localApps);
      if (Array.isArray(apps) && apps.length > 0) {
        await supabase.from('applications').insert(
          apps.map((a: { jobTitle: string; company: string; status: string; appliedAt: string; notes?: string }) => ({
            user_id: userId,
            job_title: a.jobTitle,
            company: a.company,
            status: a.status,
            applied_at: a.appliedAt,
            notes: a.notes ?? null,
          }))
        );
      }
    }

    console.log('[Jobpilot] Successfully migrated localStorage data to Supabase');
    return true;
  } catch (err) {
    console.error('[Jobpilot] Migration failed:', err);
    return false;
  }
}
