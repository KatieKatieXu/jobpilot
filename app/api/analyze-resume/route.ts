import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimitResponse } from '../../lib/rate-limit';

export interface Suggestion {
  id: string;
  category: 'impact' | 'ats' | 'clarity' | 'gaps' | 'formatting';
  section: string;
  original: string;
  revised: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const ANALYZE_PROMPT = `You are an expert resume coach specializing in UX design, product design, and AI-adjacent roles. Analyze this resume and return 6-10 specific, actionable improvement suggestions.

Return ONLY a valid JSON array of suggestion objects. No markdown, no explanation, just the JSON array.

Each suggestion must have these exact fields:
- id: unique string like "s1", "s2", etc.
- category: one of "impact", "ats", "clarity", "gaps", "formatting"
- section: the resume section this applies to (e.g., "Experience - Company Name", "Skills", "Summary", "Education")
- original: the EXACT text snippet from the resume that should be changed (must be present verbatim in the resume)
- revised: the improved replacement text
- reason: one sentence explaining why this change improves the resume
- priority: "high", "medium", or "low"

Focus on:
- impact: Replace weak verbs (helped, worked on, assisted) with strong action verbs; add metrics where missing (e.g., "users" → "50+ users", "improved performance" → "reduced load time by 40%")
- ats: Add missing keywords for senior UX/product design and AI roles (e.g., "design systems", "user research", "Figma", "cross-functional", "stakeholder alignment")
- clarity: Tighten overly wordy bullets to be more concise and scannable
- gaps: Flag missing sections like a professional summary, portfolio link, or LinkedIn URL
- formatting: Structural issues (inconsistent date formats, etc.)

The resume to analyze:
`;

export async function POST(req: NextRequest) {
  // Rate limit: auto-detects tier (free: 3/day, pro: 30/day, premium: unlimited)
  const limited = rateLimitResponse(req);
  if (limited) return limited;

  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Resume text is required and must be at least 50 characters' }, { status: 400 });
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
          content: ANALYZE_PROMPT + '\n\n' + resumeText,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Parse the JSON response
    let suggestions: Suggestion[];
    try {
      // Extract JSON array even if there's surrounding text
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      suggestions = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Failed to parse suggestions JSON:', content.text);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate suggestions
    const validCategories = ['impact', 'ats', 'clarity', 'gaps', 'formatting'];
    const validPriorities = ['high', 'medium', 'low'];

    const validated = suggestions
      .filter((s) => s && typeof s === 'object')
      .map((s, i) => ({
        id: s.id || `s${i + 1}`,
        category: validCategories.includes(s.category) ? s.category : 'clarity',
        section: s.section || 'Resume',
        original: s.original || '',
        revised: s.revised || '',
        reason: s.reason || '',
        priority: validPriorities.includes(s.priority) ? s.priority : 'medium',
      }))
      .filter((s) => s.original && s.revised) as Suggestion[];

    return NextResponse.json({ suggestions: validated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Analyze resume error:', message);
    return NextResponse.json({ error: 'Failed to analyze resume: ' + message }, { status: 500 });
  }
}
