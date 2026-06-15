import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimitResponse } from '../../lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: auto-detects tier (free: 3/day, pro: 30/day, premium: unlimited)
  const limited = rateLimitResponse(req);
  if (limited) return limited;

  try {
    const formData = await req.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    const extracted = extractFields(text);

    return NextResponse.json({ text, extracted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('PDF parse error:', message);
    return NextResponse.json({ error: 'Failed to parse PDF: ' + message }, { status: 500 });
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // First try pdf-parse for text-based PDFs
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    const text = data.text?.trim() || '';
    if (text.length >= 100) {
      return text;
    }
    console.log('pdf-parse returned insufficient text, falling back to Claude Vision');
  } catch (e) {
    console.log('pdf-parse failed, falling back to Claude Vision:', e);
  }

  // Fallback: use Claude Vision to extract text from the PDF
  return await extractTextWithClaudeVision(buffer);
}

async function extractTextWithClaudeVision(buffer: Buffer): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey });
  const base64 = buffer.toString('base64');

  // Use 'as any' for the document block since the SDK type definitions
  // may not expose the PDF document type in all versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentBlock: any = {
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: base64,
    },
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          documentBlock,
          {
            type: 'text',
            text: 'Extract all text from this resume PDF. Return only the extracted text content, preserving structure and formatting as much as possible. Do not add any commentary or explanation.',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected Claude Vision response format');
}

function extractFields(text: string): Record<string, string> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const phoneMatch = text.match(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  const websiteMatch = text.match(/https?:\/\/(?!linkedin|github)[\w.-]+\.[a-z]{2,}[\w/.-]*/i);

  const nameLine = lines.find(
    (l) => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(l) && l.split(' ').length <= 4
  );

  // Extract current title — typically the line right after the name, or a line with common title keywords
  const nameIdx = nameLine ? lines.indexOf(nameLine) : -1;
  let currentTitle = '';
  if (nameIdx >= 0 && nameIdx + 1 < lines.length) {
    const nextLine = lines[nameIdx + 1];
    // If the next line looks like a title (not an email/phone/url), use it
    if (nextLine && !/[@()\d{3}]/.test(nextLine) && !nextLine.includes('http') && nextLine.length < 80) {
      currentTitle = nextLine;
    }
  }
  // Fallback: look for common title patterns anywhere
  if (!currentTitle) {
    const titlePatterns = /\b(senior|staff|principal|lead|director|vp|manager|head of|chief)\b.*\b(designer|engineer|developer|product|ux|ui|architect|analyst|scientist|consultant)\b/i;
    const titleLine = lines.find((l) => titlePatterns.test(l) && l.length < 80);
    if (titleLine) currentTitle = titleLine;
  }

  // Extract years of experience — look for "X+ years" or "X years of experience" patterns
  let yearsExperience = '';
  const yearsMatch = text.match(/(\d{1,2})\+?\s*years?\s*(of\s*)?(professional\s*)?(experience|in\b)/i);
  if (yearsMatch) {
    yearsExperience = yearsMatch[1];
  } else {
    // Fallback: count from earliest date in work experience section
    const expIdx = lines.findIndex((l) => /^(work\s)?experience/i.test(l));
    if (expIdx !== -1) {
      const expSection = lines.slice(expIdx, expIdx + 60).join(' ');
      const yearMatches = expSection.match(/\b(19|20)\d{2}\b/g);
      if (yearMatches && yearMatches.length > 0) {
        const earliest = Math.min(...yearMatches.map(Number));
        const years = new Date().getFullYear() - earliest;
        if (years > 0 && years < 50) yearsExperience = String(years);
      }
    }
  }

  // Extract location — look for "City, State" or "City, ST" patterns
  let location = '';
  const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
  if (locationMatch) {
    location = locationMatch[0];
  }

  const expIdx = lines.findIndex((l) => /^(work\s)?experience/i.test(l));
  const summaryChunk =
    expIdx !== -1
      ? lines.slice(expIdx + 1, expIdx + 20).join('\n')
      : lines.slice(0, 20).join('\n');

  return {
    name: nameLine || '',
    email: emailMatch?.[0] || '',
    phone: phoneMatch?.[0] || '',
    linkedin: linkedinMatch ? `https://www.${linkedinMatch[0]}` : '',
    github: githubMatch ? `https://www.${githubMatch[0]}` : '',
    website: websiteMatch?.[0] || '',
    currentTitle,
    yearsExperience,
    location,
    experienceSummary: summaryChunk,
  };
}
