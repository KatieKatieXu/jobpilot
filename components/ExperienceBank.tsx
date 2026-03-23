'use client';

import { useState, useEffect } from 'react';

export interface ExperienceEntry {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  createdAt: string;
}

const STORAGE_KEY = 'jobpilot_experience_bank';

const SEED_ENTRIES: ExperienceEntry[] = [
  {
    id: 'seed-1',
    question: 'Please describe your recent experience designing complex software products, focusing on user experience, interaction, and visual design. How have your design solutions supported business objectives while balancing user needs?',
    answer: `At Bank of America, I led UX on an enterprise cloud platform where the core business objective was operational efficiency — every hour saved for internal employees directly translates to cost savings at scale. The pre-approval feature was originally requested by power users — managers who wanted to pre-set day-2 approvals as a voucher for teammates to use in their absence — but after launch, support tickets spiked and bounce rates rose among the broader user base who hadn't requested the feature and didn't understand it. I conducted interviews with 5 affected users and identified two root causes: users didn't understand what pre-approval meant in relation to the existing feature, and they didn't know when to use it. My approach was intentional — rather than a heavy redesign, I used the least effort necessary to serve the original power user request while protecting the broader user base: (1) A simple radio selector to choose between executing now or later. (2) Pairing with a contextual tip explaining exactly when pre-approval made sense, without disrupting the original layout. The result was a significant decrease in support tickets and improved task completion rate — serving both the business goal of cost efficiency and the full spectrum of user needs.`,
    tags: ['enterprise UX', 'user research', 'business impact', 'complex software'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    question: 'Describe your proficiency with building high-fidelity prototypes. What tool(s) do you leverage and how do you use prototypes to communicate design concepts?',
    answer: `When a new feature idea surfaces during a PI planning call and the concept is still vague, I'll follow up either in the meeting or immediately after with a vibe-coded high-fidelity prototype — because my team responds better to something visual than to abstract descriptions, and my goal is always to keep the conversation moving forward fast. My process is to sketch a very low-fidelity draft with prompt about high-fidelity UI descriptions, then run it through both Figma Make and Google Stitch simultaneously, pick the best pieces from each output, and using prompt to assemble them into a polished prototype in Figma Make or Cursor in a few minutes. My primary tool is Figma, where I work within existing design systems to leverage established components, build variants, and create new elements when needed to maintain consistency and scalability. Once the design direction is finalized, I rebuild using proper design system elements to ensure everything is clean, consistent, and ready for design management and handoff.`,
    tags: ['prototyping', 'Figma', 'AI tools', 'design systems'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    question: 'Please describe how you collaborate with key stakeholders (including designers, product managers, engineers, researchers, leadership) through the end-to-end design process of a product? Please share an example of how your input influenced strategy or final outcomes.',
    answer: `At Bank of America, my collaboration model evolved significantly over 8 years. Early on I worked purely within the design cycle — taking briefs, delivering wireframes. But I realized that to influence outcomes, I needed a common language with each stakeholder group. With engineers, I learned enough front-end to contribute to release documentation alongside them. More importantly, I started bringing user behavior data to our conversations. When a new pre-approval feature caused a spike in support tickets and bounce rates, I didn't just flag it — I showed them the data, proposed a redesign, and tracked the improvement together. After that, they trusted me as a partner, not just a deliverable machine. With product managers, that trust from engineers gave me credibility to earn a seat in PI planning calls — where roadmap priorities were set. I stopped being someone who reacted to decisions and started being someone who shaped them. For example, during the ordering workflow redesign, I used user interview findings to make the case for bulk ordering — a feature that wasn't originally scoped. It became the centerpiece of the redesign and directly drove a 40% reduction in order submission time and a 200%+ user growth in the first quarter post-launch. With leadership, I let outcomes speak. NPS going from 5 to 36, support tickets dropping 20% — those numbers opened doors to more strategic conversations.`,
    tags: ['stakeholder collaboration', 'cross-functional', 'strategy', 'influence'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-4',
    question: 'In 3-5 sentences, describe a recent project or task where you used AI tools to achieve specific goals.',
    answer: `My goals were clear from the start: deliver a production-ready app to the App Store in 30 days, and achieve the best design quality possible — no shortcuts. To hit both, I built an AI-powered workflow where Figma connected directly to Cursor via the Model Context Protocol (MCP), letting design specs flow into code generation with near-zero manual translation — cutting build cycles by 70% and freeing me to focus on design quality. When I wasn't satisfied with a design direction, I used Google Stitch to explore more possibilities, sometimes taking one element from one AI-generated concept and combining it with a piece from another, using my own design judgment to curate and decide what was truly right for the product. This hybrid approach — AI for speed and exploration, human judgment for quality — is what allowed me to ship a fully functional, App Store-approved product solo in under four weeks, finishing ahead of the 30-day deadline.`,
    tags: ['AI tools', 'Figma MCP', 'shipping', 'solo builder'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-5',
    question: 'Describe a situation where you identified an issue when using the output generated by an AI tool. Explain what the issue was and steps you took to correct it.',
    answer: `When building PawpawStory, I was using screenshots to guide Cursor in replicating my UI designs, but the generated output consistently fell short of my design standards — the fidelity wasn't close enough to what I had crafted in Figma. I identified the root issue: screenshots lose design intent, they're a lossy translation. To correct this, I first asked AI directly: "what is the most advanced way to translate Figma designs into code with the highest fidelity?" — which led me to discover the Figma-to-Cursor MCP connection, and then I went to YouTube to learn MCP setup best practices to implement it properly. The gap between my design vision and the final built product closed dramatically, ultimately allowing me to ship to the App Store in under four weeks.`,
    tags: ['AI problem solving', 'Figma MCP', 'critical thinking', 'PawpawStory'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-6',
    question: 'How do you keep up with the latest developments in AI tools and technologies? Please share a recent example of anything AI-related you recently learned and applied.',
    answer: `I stay current through two parallel paths: building with AI every day, and following leading podcasts and YouTube channels in the industry. The most valuable learning happens in the first path — when something isn't working, I don't just troubleshoot, I ask AI what the most advanced alternative approach would be. For example, when building PawpawStory I started by feeding screenshots to Cursor to guide the UI build, but the output wasn't meeting my design standards. I asked: "what's the most advanced way to translate my Figma designs into code with the highest fidelity?" — and that's how I discovered the Figma-to-Cursor MCP connection and the practice of using .md files to save design settings as reusable skills. That single question didn't just solve my immediate problem — it changed how I work entirely.`,
    tags: ['AI learning', 'continuous improvement', 'Figma MCP', 'growth mindset'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-7',
    question: 'Why are you looking for new job opportunities?',
    answer: `After 8 years at Bank of America, I've grown from intern to VP Design Lead and I'm proud of what I built there. But I've reached a point where I'm ready for a bigger stage — specifically, I want to work on AI products that reach millions of users, where I can bring both the enterprise design rigor and the fast, independent shipping ability I've developed. This feels like the right moment to make that move.`,
    tags: ['motivation', 'career transition', 'AI products'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-8',
    question: 'What are the most important things that you are looking for in your next job?',
    answer: `First, an environment where AI is at the center of the product, not just a side tool — I've been deeply immersed in building with AI and I want to be somewhere that's pushing that frontier. Second, a place where I can wear many hats and keep growing — my best work at Bank of America came when I was close to data, and strategy all at once, and I want that same cross-functional depth in my next role.`,
    tags: ['job preferences', 'AI-first', 'growth', 'cross-functional'],
    createdAt: new Date().toISOString(),
  },
];

function loadEntries(): ExperienceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // First time — seed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ENTRIES));
    return SEED_ENTRIES;
  } catch {
    return SEED_ENTRIES;
  }
}

function saveEntries(entries: ExperienceEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ExperienceBank() {
  const [entries, setEntries] = useState<ExperienceEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null = not editing, 'new' = adding new
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formTagInput, setFormTagInput] = useState('');

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const openAddForm = () => {
    setFormQuestion('');
    setFormAnswer('');
    setFormTags([]);
    setFormTagInput('');
    setEditingId('new');
    setExpandedId(null);
  };

  const openEditForm = (entry: ExperienceEntry) => {
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
    let updated: ExperienceEntry[];
    if (editingId === 'new') {
      const newEntry: ExperienceEntry = {
        id: generateId(),
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        tags: formTags,
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
    saveEntries(updated);
    setEntries(updated);
    cancelForm();
  };

  const deleteEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    saveEntries(updated);
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

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Experience Bank</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
            {entries.length} stories
          </span>
        </div>
        <button
          onClick={openAddForm}
          disabled={editingId !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
        >
          + Add Experience
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Save your real stories and detailed answers here. Jobpilot uses them as reference when generating AI answers for job applications — the richer your bank, the better your answers.
      </p>

      {/* Add / Edit form */}
      {editingId !== null && (
        <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-violet-300">
            {editingId === 'new' ? '+ New Experience' : '✏️ Edit Experience'}
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

      {/* Entry list */}
      {entries.length === 0 && editingId === null && (
        <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700 rounded-2xl">
          <p className="mb-2">No experiences yet.</p>
          <button onClick={openAddForm} className="text-violet-400 hover:text-violet-300 transition">
            Add your first story →
          </button>
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const isEditing = editingId === entry.id;
          if (isEditing) return null; // form shown above

          return (
            <div
              key={entry.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition"
            >
              {/* Card header — always visible */}
              <div className="flex items-start gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className={`text-sm text-slate-200 leading-snug ${isExpanded ? '' : 'truncate'}`}>
                    {entry.question}
                  </p>
                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.tags.map((tag) => (
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
                  <p className="text-xs font-semibold text-emerald-400 mb-2">Your Answer</p>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
