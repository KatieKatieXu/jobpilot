'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getExperienceEntries, saveExperienceEntries } from '@/app/lib/db';

const STORAGE_KEY = 'jobpilot_experience_bank';
const MARKET_KEY = 'jobpilot_market_report';

export interface StoryEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  purpose?: string; // For AI-generated questions
  source: 'user' | 'ai'; // Track where this came from
  createdAt: string;
}

// No seed data — every user starts with an empty story bank

interface MarketQuestion {
  id: string;
  question: string;
  placeholder: string;
  purpose: string;
}

function loadEntries(): StoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old entries without source field
      return parsed.map((e: StoryEntry) => ({
        ...e,
        source: e.source || 'user',
      }));
    }
    // No saved entries — start with empty state
    return [];
  } catch {
    return [];
  }
}

function saveEntries(entries: StoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function StoriesPage() {
  const supabase = useSupabase();
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [aiQuestions, setAiQuestions] = useState<MarketQuestion[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'ai-suggested'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');

  const persistEntries = useCallback((updated: StoryEntry[]) => {
    saveExperienceEntries(supabase, updated);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await getExperienceEntries(supabase);
        if (loaded.length > 0) {
          // Migrate old entries without source field
          const migrated = loaded.map((e) => ({
            ...e,
            source: e.source || 'user',
            createdAt: (e as StoryEntry).createdAt || new Date().toISOString(),
          })) as StoryEntry[];
          setEntries(migrated);
        } else if (supabase) {
          // Authenticated but no entries in DB — start fresh
          setEntries([]);
        } else {
          // Anonymous — use localStorage seed logic
          setEntries(loadEntries());
        }
      } catch {
        setEntries(loadEntries());
      }
    })();

    // Load AI questions from market report
    const marketRaw = localStorage.getItem(MARKET_KEY);
    if (marketRaw) {
      try {
        const market = JSON.parse(marketRaw);
        if (market.analysis?.experienceQuestions) {
          setAiQuestions(market.analysis.experienceQuestions);
        }
        if (market.answers) {
          setAiAnswers(market.answers);
        }
      } catch {}
    }
  }, [supabase]);

  const openAddForm = () => {
    setFormQuestion('');
    setFormAnswer('');
    setFormTags([]);
    setFormTagInput('');
    setEditingId('new');
    setExpandedId(null);
  };

  const openEditForm = (entry: StoryEntry) => {
    setFormQuestion(entry.question);
    setFormAnswer(entry.answer);
    setFormTags([...entry.tags]);
    setFormTagInput('');
    setEditingId(entry.id);
    setExpandedId(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormTags([]);
    setFormTagInput('');
  };

  const saveForm = () => {
    if (!formQuestion.trim() || !formAnswer.trim()) return;
    let updated: StoryEntry[];
    if (editingId === 'new') {
      const newEntry: StoryEntry = {
        id: generateId(),
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        tags: formTags,
        source: 'user',
        createdAt: new Date().toISOString(),
      };
      updated = [newEntry, ...entries];
    } else {
      updated = entries.map((e) =>
        e.id === editingId
          ? { ...e, question: formQuestion.trim(), answer: formAnswer.trim(), tags: formTags }
          : e
      );
    }
    persistEntries(updated);
    setEntries(updated);
    cancelForm();
  };

  const deleteEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    persistEntries(updated);
    setEntries(updated);
    setDeleteConfirmId(null);
    if (expandedId === id) setExpandedId(null);
  };

  const addTag = () => {
    const tag = formTagInput.trim();
    if (tag && !formTags.includes(tag)) {
      setFormTags((prev) => [...prev, tag]);
    }
    setFormTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormTags((prev) => prev.filter((t) => t !== tag));
  };

  // Save AI question answer and convert to permanent story
  const saveAiAnswer = (q: MarketQuestion, answer: string) => {
    if (!answer.trim()) return;
    
    // Check if already saved as a story
    const exists = entries.some((e) => e.question === q.question);
    if (exists) {
      // Update existing
      const updated = entries.map((e) =>
        e.question === q.question ? { ...e, answer: answer.trim() } : e
      );
      saveEntries(updated);
      setEntries(updated);
    } else {
      // Create new story from AI question
      const newEntry: StoryEntry = {
        id: generateId(),
        question: q.question,
        answer: answer.trim(),
        tags: ['ai-suggested'],
        purpose: q.purpose,
        source: 'ai',
        createdAt: new Date().toISOString(),
      };
      const updated = [newEntry, ...entries];
      saveEntries(updated);
      setEntries(updated);
    }
    
    // Also save to market answers for backward compat
    const marketRaw = localStorage.getItem(MARKET_KEY);
    if (marketRaw) {
      try {
        const market = JSON.parse(marketRaw);
        market.answers = { ...market.answers, [q.id]: answer };
        localStorage.setItem(MARKET_KEY, JSON.stringify(market));
        setAiAnswers((prev) => ({ ...prev, [q.id]: answer }));
      } catch {}
    }
  };

  // Filter out AI questions that already have a story entry
  const unansweredAiQuestions = aiQuestions.filter(
    (q) => !entries.some((e) => e.question === q.question)
  );

  const userStories = entries.filter((e) => e.source === 'user');
  const aiStories = entries.filter((e) => e.source === 'ai');

  // Filter entries based on search query
  const filteredEntries = searchQuery.trim()
    ? entries.filter((e) => 
        e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : entries;

  // Download all stories as text file
  const downloadStories = () => {
    if (entries.length === 0) return;
    
    const lines: string[] = [
      '# My Career Stories',
      `# Exported from Jobpilot on ${new Date().toLocaleDateString()}`,
      '',
      '---',
      '',
    ];
    
    entries.forEach((entry, i) => {
      lines.push(`## Story ${i + 1}`);
      if (entry.tags.length > 0) {
        lines.push(`Tags: ${entry.tags.join(', ')}`);
      }
      lines.push('');
      lines.push(`**Q: ${entry.question}**`);
      lines.push('');
      lines.push(entry.answer);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobpilot-stories-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Stories</h1>
            <p className="text-slate-400 mt-1">Your career stories for interviews and applications.</p>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={downloadStories}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-xl transition text-sm"
              >
                ⬇ Export
              </button>
            )}
            <button
              onClick={openAddForm}
              disabled={editingId !== null}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold rounded-xl transition text-sm"
            >
              + Add Story
            </button>
          </div>
        </div>

        {/* Value proposition banner */}
        <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-700/40 rounded-2xl p-5">
          <div className="flex gap-4">
            <span className="text-2xl">✨</span>
            <div>
              <h3 className="text-white font-semibold mb-1">Your stories power everything</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Add stories anytime during your job search — the more you share, the better Jobpilot works for you. 
                Your stories directly improve your <span className="text-violet-400">Market Analysis</span>, 
                make <span className="text-violet-400">cover letters</span> more authentic, 
                and help match you with <span className="text-violet-400">higher-fit jobs</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Search + Stats */}
        <div className="flex items-center gap-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search questions, answers, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
            <span className="text-violet-400">📖</span>
            <span className="text-sm text-slate-300">{entries.length} stories</span>
          </div>
          {unansweredAiQuestions.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-900/20 border border-violet-700/40 rounded-xl shrink-0">
              <span className="text-violet-400">✨</span>
              <span className="text-sm text-violet-300">{unansweredAiQuestions.length} AI suggestions</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === 'all'
                ? 'text-violet-400 border-violet-400'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            All Stories ({entries.length})
          </button>
          {unansweredAiQuestions.length > 0 && (
            <button
              onClick={() => setActiveTab('ai-suggested')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'ai-suggested'
                  ? 'text-violet-400 border-violet-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <span>AI Suggested</span>
              <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                {unansweredAiQuestions.length}
              </span>
            </button>
          )}
        </div>

        {/* Add / Edit form */}
        {editingId !== null && (
          <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-violet-300">
              {editingId === 'new' ? '+ New Story' : '✏️ Edit Story'}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Question / Prompt</label>
              <textarea
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="e.g. Describe how you collaborate with cross-functional stakeholders..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Answer / Story</label>
              <textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Write your detailed answer here — the more specific, the better the AI can reference it..."
                rows={10}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none transition font-[inherit] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formTags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white transition ml-0.5">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={formTagInput}
                  onChange={(e) => setFormTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag, press Enter"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500 transition"
                />
                <button
                  onClick={addTag}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={cancelForm}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={!formQuestion.trim() || !formAnswer.trim()}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition"
              >
                Save Story
              </button>
            </div>
          </div>
        )}

        {/* AI Suggested Questions Tab */}
        {activeTab === 'ai-suggested' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              These questions are generated based on your profile. Answer them to build your story bank for cover letters and interviews.
            </p>
            {unansweredAiQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700 rounded-2xl">
                <p>All AI suggestions have been answered! 🎉</p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="text-violet-400 hover:text-violet-300 mt-2 transition"
                >
                  View all stories →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {unansweredAiQuestions.map((q) => (
                  <AiQuestionCard
                    key={q.id}
                    question={q}
                    initialAnswer={aiAnswers[q.id] || ''}
                    onSave={(answer) => saveAiAnswer(q, answer)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Stories Tab */}
        {activeTab === 'all' && (
          <>
            {entries.length === 0 && editingId === null && (
              <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700 rounded-2xl">
                <p className="mb-2">No stories yet.</p>
                <button onClick={openAddForm} className="text-violet-400 hover:text-violet-300 transition">
                  Add your first story →
                </button>
              </div>
            )}

            {/* Search results indicator */}
            {searchQuery && (
              <div className="text-sm text-slate-400">
                Found <span className="text-violet-400 font-medium">{filteredEntries.length}</span> {filteredEntries.length === 1 ? 'story' : 'stories'} matching "{searchQuery}"
                {filteredEntries.length === 0 && (
                  <span className="ml-2">— <button onClick={() => setSearchQuery('')} className="text-violet-400 hover:text-violet-300">clear search</button></span>
                )}
              </div>
            )}

            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const isEditing = editingId === entry.id;
                if (isEditing) return null;

                return (
                  <div
                    key={entry.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition"
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3 px-4 py-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {entry.source === 'ai' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded">AI</span>
                          )}
                          <p className={`text-sm text-slate-200 leading-snug ${isExpanded ? '' : 'truncate'}`}>
                            {entry.question}
                          </p>
                        </div>
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {entry.tags.filter(t => t !== 'ai-suggested').map((tag) => (
                              <span key={tag} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {deleteConfirmId === entry.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">Delete?</span>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                            >No</button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition"
                            >Yes</button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditForm(entry)}
                              disabled={editingId !== null}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-slate-800 transition disabled:opacity-30"
                              title="Edit"
                            >✏️</button>
                            <button
                              onClick={() => setDeleteConfirmId(entry.id)}
                              disabled={editingId !== null}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition disabled:opacity-30"
                              title="Delete"
                            >🗑</button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition text-xs"
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded answer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                        {entry.purpose && (
                          <p className="text-xs text-violet-400 mb-2">→ {entry.purpose}</p>
                        )}
                        <p className="text-xs font-semibold text-emerald-400 mb-2">Your Answer</p>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// Separate component for AI question cards with local state
function AiQuestionCard({
  question,
  initialAnswer,
  onSave,
}: {
  question: MarketQuestion;
  initialAnswer: string;
  onSave: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState(initialAnswer);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(answer);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="bg-green-900/10 border border-green-800/30 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          <p className="text-sm text-green-300">Saved to your stories!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{question.question}</p>
        {question.purpose && (
          <p className="text-xs text-violet-400 mt-1">→ {question.purpose}</p>
        )}
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={question.placeholder}
        rows={6}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-none transition"
      />
      <button
        onClick={handleSave}
        disabled={!answer.trim()}
        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition"
      >
        Save to Stories
      </button>
    </div>
  );
}
