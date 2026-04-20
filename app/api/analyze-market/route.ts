import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimitResponse } from '../../lib/rate-limit';

export interface MarketAnalysis {
  bestFitRoles: {
    title: string;
    reasoning: string;
  }[];
  targetCompanyTypes: {
    type: string;
    whyYouWin: string;
  }[];
  marketFitScore: number;
  linkedinAdvice: {
    id: string;
    text: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  experienceQuestions: {
    id: string;
    question: string;
    placeholder: string;
    purpose: string;
  }[];
}

const ANALYZE_PROMPT = `You are an expert career strategist specializing in tech, design, and AI roles. Analyze this candidate's profile and provide a comprehensive market positioning analysis.

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation, just JSON):

{
  "bestFitRoles": [
    {
      "title": "Exact role title that positions them best (e.g., 'Senior AI Product Designer')",
      "reasoning": "1-2 sentences on why this title leverages their unique background"
    }
  ],
  "targetCompanyTypes": [
    {
      "type": "Company type description (e.g., 'AI-first startups, Series A-C')",
      "whyYouWin": "2-3 sentences on why this candidate has an edge at this type of company"
    }
  ],
  "marketFitScore": 75,
  "linkedinAdvice": [
    {
      "id": "l1",
      "text": "Specific, actionable LinkedIn improvement",
      "priority": "high"
    }
  ],
  "experienceQuestions": [
    {
      "id": "q1",
      "question": "A specific question to draw out their unique experience",
      "placeholder": "Brief hint on what to include",
      "purpose": "How this answer will be used (e.g., 'For cover letters targeting AI companies')"
    }
  ]
}

Guidelines:
- bestFitRoles: 2-3 role titles that best position their unique combination of skills. Be specific (not generic "UX Designer")
- targetCompanyTypes: 3-4 company types (not specific company names). Focus on where their background gives them an unfair advantage
- marketFitScore: 0-100 based on how well-positioned they are for their target roles. Consider: skill match, experience depth, differentiation, market demand
- linkedinAdvice: 5-8 specific, actionable items based on their actual profile. Include headline optimization, missing keywords, profile gaps. Each should be completable in <10 minutes
- experienceQuestions: 4-6 questions that will draw out stories/details useful for cover letters and interview prep. Tailor to their background and target roles

The candidate profile to analyze:
`;

interface ProfileData {
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
}

function formatProfileForAnalysis(profile: ProfileData): string {
  const sections: string[] = [];
  
  if (profile.fullName) sections.push(`Name: ${profile.fullName}`);
  if (profile.currentTitle) sections.push(`Current Title: ${profile.currentTitle}`);
  if (profile.yearsExperience) sections.push(`Years of Experience: ${profile.yearsExperience}`);
  if (profile.location) sections.push(`Location: ${profile.location}`);
  if (profile.targetRoles?.length) sections.push(`Target Roles: ${profile.targetRoles.join(', ')}`);
  if (profile.workStyle?.length) sections.push(`Work Style Preference: ${Array.isArray(profile.workStyle) ? profile.workStyle.join(', ') : profile.workStyle}`);
  if (profile.targetCompensation) sections.push(`Target Compensation: ${profile.targetCompensation}`);
  if (profile.linkedinUrl) sections.push(`LinkedIn: ${profile.linkedinUrl}`);
  if (profile.portfolioUrl) sections.push(`Portfolio: ${profile.portfolioUrl}`);
  if (profile.githubUrl) sections.push(`GitHub: ${profile.githubUrl}`);
  if (profile.topSkills) sections.push(`\nTop Skills:\n${profile.topSkills}`);
  if (profile.differentiation) sections.push(`\nDifferentiation/Unique Value:\n${profile.differentiation}`);
  if (profile.workExperience) sections.push(`\nWork Experience:\n${profile.workExperience}`);
  if (profile.sideProjects) sections.push(`\nSide Projects:\n${profile.sideProjects}`);
  if (profile.specialRequests) sections.push(`\nSpecial Requests/Notes:\n${profile.specialRequests}`);
  
  return sections.join('\n');
}

export async function POST(req: NextRequest) {
  // Rate limit: auto-detects tier (free: 3/day, pro: 30/day, premium: unlimited)
  const limited = rateLimitResponse(req);
  if (limited) return limited;

  try {
    const { profile } = await req.json();

    if (!profile || typeof profile !== 'object') {
      return NextResponse.json({ error: 'Profile data is required' }, { status: 400 });
    }

    const profileText = formatProfileForAnalysis(profile);
    if (profileText.length < 50) {
      return NextResponse.json({ error: 'Profile is too incomplete for analysis. Please fill out more fields.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: ANALYZE_PROMPT + '\n\n' + profileText,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Parse the JSON response
    let analysis: MarketAnalysis;
    try {
      // Extract JSON object even if there's surrounding text
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Failed to parse analysis JSON:', content.text);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and normalize the response
    const validated: MarketAnalysis = {
      bestFitRoles: (analysis.bestFitRoles || []).slice(0, 3).map((r, i) => ({
        title: r.title || `Role ${i + 1}`,
        reasoning: r.reasoning || '',
      })),
      targetCompanyTypes: (analysis.targetCompanyTypes || []).slice(0, 4).map((c, i) => ({
        type: c.type || `Company Type ${i + 1}`,
        whyYouWin: c.whyYouWin || '',
      })),
      marketFitScore: Math.min(100, Math.max(0, analysis.marketFitScore || 50)),
      linkedinAdvice: (analysis.linkedinAdvice || []).slice(0, 8).map((a, i) => ({
        id: a.id || `l${i + 1}`,
        text: a.text || '',
        priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
      })).filter(a => a.text),
      experienceQuestions: (analysis.experienceQuestions || []).slice(0, 6).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || '',
        placeholder: q.placeholder || 'Share your experience...',
        purpose: q.purpose || '',
      })).filter(q => q.question),
    };

    return NextResponse.json({ analysis: validated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Analyze market error:', message);
    return NextResponse.json({ error: 'Failed to analyze market position: ' + message }, { status: 500 });
  }
}
