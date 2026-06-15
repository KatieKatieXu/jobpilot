import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimitResponse } from '../../lib/rate-limit';

export interface QAResult {
  question: string;
  answer: string;
}

const SYSTEM_PROMPT = `You are a career coach helping a job applicant write compelling, authentic answers to open-ended application questions.

Your job: write answers in the FIRST PERSON voice of the applicant, using their real background, experience, and personality. Answers should sound natural, specific, and genuine — not generic or corporate.

RULES:
- Write in first person ("I", "my", "me") — you ARE the applicant
- Use specific details from their profile and resume — real company names, real numbers, real projects
- Each answer should be 3–6 sentences — substantive but not a wall of text
- Match the tone of the question (excited/enthusiastic for mission questions, thoughtful for design questions)
- Never say "As a product designer" as the opening — vary your openers
- Never make up facts that aren't in the profile — if something isn't there, speak broadly but authentically
- Return ONLY a valid JSON array, no markdown, no preamble

Output format — a JSON array where each object has:
- question: the exact question text (unchanged)
- answer: the written answer in applicant's voice
`;

interface ExperienceBankEntry {
  question: string;
  answer: string;
  tags: string[];
}

function buildUserPrompt(
  questions: string[],
  profile: Record<string, string>,
  job: { company: string; role: string; companyOutlook?: string; compatibility?: string },
  experienceBank: ExperienceBankEntry[] = []
): string {
  const profileSection = `
APPLICANT PROFILE:
- Name: ${profile.fullName || 'Not provided'}
- Current Title: ${profile.currentTitle || 'Not provided'}
- Years of Experience: ${profile.yearsExperience || 'Not provided'}
- Location: ${profile.location || 'Not provided'}
- Top Skills: ${profile.topSkills || 'Not provided'}
- What makes them different: ${profile.differentiation || ''}
- Side projects / accomplishments: ${profile.sideProjects || ''}
- Work Experience: ${profile.workExperience || ''}
- Target Compensation: ${profile.targetCompensation || 'Not provided'}
- LinkedIn: ${profile.linkedinUrl || ''}
- Portfolio: ${profile.portfolioUrl || ''}
- GitHub: ${profile.githubUrl || ''}
`.trim();

  const jobSection = `
TARGET ROLE:
- Company: ${job.company}
- Role: ${job.role}
- Company context: ${job.companyOutlook || ''}
- Why they're a fit: ${job.compatibility || ''}
`.trim();

  const bankSection = experienceBank.length > 0
    ? `
EXPERIENCE BANK — The applicant's real past answers to similar questions. Use these as a reference for tone, voice, specific stories, and examples. Pull in concrete details when relevant:
${experienceBank.map((e, i) => `[${i + 1}] Q: ${e.question}\nA: ${e.answer}`).join('\n\n')}
`.trim()
    : '';

  const questionsSection = `
QUESTIONS TO ANSWER (return one answer per question, in order):
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`.trim();

  const parts = [profileSection, jobSection];
  if (bankSection) parts.push(bankSection);
  parts.push(questionsSection);
  parts.push('Return a JSON array with one object per question: [{ "question": "...", "answer": "..." }, ...]');

  return parts.join('\n\n');
}

// Parse pasted text into individual questions
// Handles numbered lists, bullet points, or line-separated blocks
function parseQuestions(raw: string): string[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  // Try to detect numbered list: "1. Question", "1) Question", "Q1:", etc.
  const numbered = lines.filter((l) => /^(\d+[\.\):]|\bQ\d+[\.\):])/i.test(l));
  if (numbered.length >= 2) {
    return numbered.map((l) => l.replace(/^(\d+[\.\):]|\bQ\d+[\.\):])\s*/i, '').trim());
  }

  // Try bullet points
  const bullets = lines.filter((l) => /^[-•*]\s/.test(l));
  if (bullets.length >= 2) {
    return bullets.map((l) => l.replace(/^[-•*]\s+/, '').trim());
  }

  // Fall back: treat each non-empty line as a question, or group by blank lines
  const raw2 = raw.trim();
  const blocks = raw2.split(/\n{2,}/).map((b) => b.replace(/\n/g, ' ').trim()).filter(Boolean);
  if (blocks.length >= 2) return blocks;

  // Single question or multi-line paragraph — return as-is
  return [raw2];
}

export async function POST(req: NextRequest) {
  // Rate limit: auto-detects tier (free: 3/day, pro: 30/day, premium: unlimited)
  const limited = rateLimitResponse(req);
  if (limited) return limited;

  try {
    const { rawQuestions, profile, job, experienceBank } = await req.json();

    if (!rawQuestions || typeof rawQuestions !== 'string' || rawQuestions.trim().length < 5) {
      return NextResponse.json({ error: 'Please paste at least one question.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const questions = parseQuestions(rawQuestions);
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Could not detect any questions. Try pasting one per line.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const userPrompt = buildUserPrompt(questions, profile || {}, job || { company: '', role: '' }, experienceBank || []);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response format');

    let results: QAResult[];
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found');
      results = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Failed to parse AI response');
    }

    // Validate shape
    const validated = results
      .filter((r) => r && typeof r.question === 'string' && typeof r.answer === 'string')
      .map((r) => ({ question: r.question.trim(), answer: r.answer.trim() }));

    return NextResponse.json({ results: validated, questionCount: validated.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Answer questions error:', message);
    return NextResponse.json({ error: 'Failed to generate answers: ' + message }, { status: 500 });
  }
}
