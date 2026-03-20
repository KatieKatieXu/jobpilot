import { NextRequest, NextResponse } from 'next/server';
import type { Suggestion } from '../analyze-resume/route';

export async function POST(req: NextRequest) {
  try {
    const { originalText, approvedSuggestions } = await req.json() as {
      originalText: string;
      approvedSuggestions: Suggestion[];
    };

    if (!originalText || typeof originalText !== 'string') {
      return NextResponse.json({ error: 'Original resume text is required' }, { status: 400 });
    }

    if (!Array.isArray(approvedSuggestions)) {
      return NextResponse.json({ error: 'approvedSuggestions must be an array' }, { status: 400 });
    }

    // Apply each approved suggestion via string replacement
    let revisedText = originalText;
    let appliedCount = 0;

    for (const suggestion of approvedSuggestions) {
      if (suggestion.original && suggestion.revised) {
        if (revisedText.includes(suggestion.original)) {
          revisedText = revisedText.replace(suggestion.original, suggestion.revised);
          appliedCount++;
        } else {
          // Try a more flexible match (trimmed)
          const trimmedOriginal = suggestion.original.trim();
          if (revisedText.includes(trimmedOriginal)) {
            revisedText = revisedText.replace(trimmedOriginal, suggestion.revised.trim());
            appliedCount++;
          }
        }
      }
    }

    // Generate a clean markdown-formatted version
    const markdownVersion = generateMarkdown(revisedText);

    return NextResponse.json({
      revisedText,
      markdownVersion,
      appliedCount,
      totalSuggestions: approvedSuggestions.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Export resume error:', message);
    return NextResponse.json({ error: 'Failed to export resume: ' + message }, { status: 500 });
  }
}

function generateMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }

    // Detect section headers (all caps or title-case short lines)
    if (
      /^[A-Z][A-Z\s&/]+$/.test(trimmed) ||
      /^(EXPERIENCE|EDUCATION|SKILLS|SUMMARY|PROJECTS|CERTIFICATIONS|AWARDS|PUBLICATIONS|CONTACT|OBJECTIVE)/i.test(trimmed)
    ) {
      result.push(`## ${trimmed}`);
    } else if (/^[-•·▪]\s/.test(trimmed) || /^\* /.test(trimmed)) {
      // Bullet points
      result.push(`- ${trimmed.replace(/^[-•·▪\*]\s*/, '')}`);
    } else {
      result.push(trimmed);
    }
  }

  return result.join('\n');
}
