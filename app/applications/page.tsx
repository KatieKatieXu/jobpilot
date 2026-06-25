'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getApplications, insertApplication, deleteApplication, updateApplication } from '@/app/lib/db';

interface Application {
  id: string | number;
  company: string;
  role: string;
  date: string;
  status: Column;
  notes?: string;
  jobDescription?: string;
}

// Normalize data from both Supabase (jobTitle/appliedAt) and localStorage (role/date)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeApp(raw: any): Application {
  return {
    id: raw.id,
    company: raw.company ?? '',
    role: raw.role ?? raw.jobTitle ?? '',
    date: raw.date ?? (raw.appliedAt ? raw.appliedAt.split('T')[0] : ''),
    status: raw.status ?? 'applied',
    notes: raw.notes ?? '',
    jobDescription: raw.jobDescription ?? '',
  };
}

type Column = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';

const columns: { id: Column; label: string; icon: string }[] = [
  { id: 'saved', label: 'Saved', icon: '📋' },
  { id: 'applied', label: 'Applied', icon: '📤' },
  { id: 'interviewing', label: 'Interviewing', icon: '📞' },
  { id: 'offer', label: 'Offer', icon: '🎉' },
  { id: 'rejected', label: 'Rejected', icon: '❌' },
];


// Custom dropdown component for status change
function StatusDropdown({
  currentStatus,
  onMove
}: {
  currentStatus: Column;
  onMove: (status: Column) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const otherCols = columns.filter((c) => c.id !== currentStatus);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:border-violet-500 transition flex items-center justify-between"
      >
        <span>Move to →</span>
        <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {otherCols.map((col) => (
            <button
              key={col.id}
              onClick={() => {
                onMove(col.id);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-violet-600 hover:text-white transition text-left flex items-center gap-2"
            >
              <span>{col.icon}</span>
              <span>{col.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Application card — clickable to open detail page
function AppCard({
  app,
  onMove,
  onRemove,
  onClick,
}: {
  app: Application;
  onMove: (status: Column) => void;
  onRemove: () => void;
  onClick: () => void;
}) {
  const hasJD = app.jobDescription && app.jobDescription.trim().length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 group hover:border-slate-700 transition">
      {/* Clickable area — opens detail page */}
      <div className="cursor-pointer" onClick={onClick}>
        <div className="flex items-start justify-between mb-0.5">
          <div className="text-sm font-semibold text-white group-hover:text-violet-300 transition">{app.company}</div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-slate-700 hover:text-slate-400 text-xs opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0"
            title="Remove"
          >✕</button>
        </div>
        <div className="text-xs text-slate-400 mb-1">{app.role}</div>
        {app.notes && (
          <div className="text-xs text-slate-500 mb-1 truncate" title={app.notes}>
            📝 {app.notes}
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-600">{app.date}</span>
          {hasJD && (
            <span className="text-xs text-violet-400 flex items-center gap-1" title="Job description saved">
              📄 JD
            </span>
          )}
        </div>
      </div>

      {/* Move dropdown — outside clickable area */}
      <StatusDropdown
        currentStatus={app.status}
        onMove={onMove}
      />
    </div>
  );
}


const DRAFT_KEY = 'jobpilot_app_draft';
const CACHE_KEY = 'jobpilot_apps_cache'; // write-through cache for instant tab-switch

interface AppDraft {
  company: string;
  role: string;
  date: string;
  status: Column;
  notes: string;
  jobDescription: string;
}

function emptyDraft(): AppDraft {
  return {
    company: '',
    role: '',
    date: new Date().toISOString().split('T')[0],
    status: 'applied',
    notes: '',
    jobDescription: '',
  };
}

export default function ApplicationsPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add Application form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AppDraft>(emptyDraft());
  const [addFormSaving, setAddFormSaving] = useState(false);

  // Helper: update apps state AND write-through cache
  const setAppsWithCache = useCallback((updater: Application[] | ((prev: Application[]) => Application[])) => {
    setApps((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Restore draft + cached apps from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setAddForm({ ...emptyDraft(), ...saved });
        setShowAddForm(true);
      }
    } catch {}
    // Immediately show cached apps (survives tab switch)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setApps(JSON.parse(cached).map(normalizeApp));
      }
    } catch {}
  }, []);

  // Persist draft to localStorage whenever form changes
  const updateForm = useCallback((updater: (prev: AppDraft) => AppDraft) => {
    setAddForm((prev: AppDraft) => {
      const next = updater(prev);
      // Save draft if any field has content
      if (next.company || next.role || next.notes || next.jobDescription) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  // Load from Supabase (or localStorage for anon users) and update cache
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getApplications(supabase);
      if (cancelled) return;
      const normalized = loaded.map(normalizeApp);
      setApps(normalized);
      // Update cache with authoritative data from Supabase
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch {}
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const moveApp = useCallback((id: string | number, newStatus: Column) => {
    setAppsWithCache((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
      updateApplication(supabase, String(id), { status: newStatus });
      return updated;
    });
  }, [supabase, setAppsWithCache]);

  const removeApp = useCallback((id: string | number) => {
    setAppsWithCache((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      deleteApplication(supabase, String(id));
      return updated;
    });
  }, [supabase, setAppsWithCache]);

  const addApplication = useCallback(async () => {
    if (!addForm.company.trim() || !addForm.role.trim()) return;
    setAddFormSaving(true);
    setSaveError(null);
    try {
      const newApp: Application = {
        id: crypto.randomUUID(),
        company: addForm.company.trim(),
        role: addForm.role.trim(),
        date: addForm.date || new Date().toISOString().split('T')[0],
        status: addForm.status,
        notes: addForm.notes.trim(),
        jobDescription: addForm.jobDescription.trim(),
      };

      // Persist single row
      const dbRow = {
        id: newApp.id,
        jobTitle: newApp.role,
        company: newApp.company,
        status: newApp.status,
        appliedAt: newApp.date ? `${newApp.date}T00:00:00.000Z` : new Date().toISOString(),
        notes: newApp.notes ?? '',
        jobDescription: newApp.jobDescription ?? '',
      };
      const success = await insertApplication(supabase, dbRow);
      if (!success) {
        setSaveError('Failed to save to database. Check browser console for details.');
      }

      // Update UI + write-through cache
      setAppsWithCache((prev) => [newApp, ...prev]);

      // Reset form + clear draft
      clearDraft();
      setAddForm(emptyDraft());
      setShowAddForm(false);
    } finally {
      setAddFormSaving(false);
    }
  }, [addForm, supabase, clearDraft, setAppsWithCache]);

  // Search filtering
  const searchLower = search.toLowerCase().trim();
  const filteredApps = searchLower
    ? apps.filter((a) =>
        a.company.toLowerCase().includes(searchLower) ||
        a.role.toLowerCase().includes(searchLower) ||
        (a.notes ?? '').toLowerCase().includes(searchLower) ||
        (a.jobDescription ?? '').toLowerCase().includes(searchLower)
      )
    : apps;

  const getApps = (col: Column) => filteredApps.filter((a) => a.status === col);

  return (
    <AppLayout>
      <div className="max-w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Application Tracking</h1>
            <p className="text-slate-400 mt-1">Track your job application pipeline.</p>
          </div>
          <button
            onClick={() => setShowAddForm((o) => !o)}
            className="self-start sm:self-auto px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Add Application
          </button>
        </div>

        {/* Error banner */}
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-400">{saveError}</p>
            <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-300 text-xs ml-4">✕</button>
          </div>
        )}

        {/* Search bar — only show when there are apps */}
        {apps.length > 0 && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition"
              placeholder="Search by company, role, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >✕</button>
            )}
          </div>
        )}

        {/* Search results count */}
        {search && (
          <p className="text-xs text-slate-500">
            {filteredApps.length} result{filteredApps.length !== 1 ? 's' : ''} for &quot;{search}&quot;
          </p>
        )}

        {/* Add Application form — inline, collapsible */}
        {showAddForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Add application</h3>
              <p className="text-xs text-slate-500 mt-1">Track a job you applied to externally.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                placeholder="Company *"
                value={addForm.company}
                onChange={(e) => updateForm((f) => ({ ...f, company: e.target.value }))}
              />
              <input
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                placeholder="Role / Title *"
                value={addForm.role}
                onChange={(e) => updateForm((f) => ({ ...f, role: e.target.value }))}
              />
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Date Applied</label>
                <input
                  type="date"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500 transition"
                  value={addForm.date}
                  onChange={(e) => updateForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Status</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500 transition"
                  value={addForm.status}
                  onChange={(e) => updateForm((f) => ({ ...f, status: e.target.value as Column }))}
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.icon} {col.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Job Description — with coaching guidance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Job Description Key Points</label>
                <span className="text-[10px] text-violet-400">Recommended</span>
              </div>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                placeholder="Paste the key requirements, responsibilities, or qualifications from the job posting..."
                rows={4}
                value={addForm.jobDescription}
                onChange={(e) => updateForm((f) => ({ ...f, jobDescription: e.target.value }))}
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                💡 Job postings often disappear after a few weeks. When you get an interview call later, you&apos;ll want to review what they were looking for. Save the key points now — future you will thank you.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Notes</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                placeholder="e.g. Referral from Alex, applied via company site, recruiter reached out on LinkedIn"
                rows={2}
                value={addForm.notes}
                onChange={(e) => updateForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addApplication}
                disabled={addFormSaving || !addForm.company.trim() || !addForm.role.trim()}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition"
              >
                {addFormSaving ? 'Saving...' : 'Save Application'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setAddForm(emptyDraft());
                  clearDraft();
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state — when no applications exist at all */}
        {apps.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No applications yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm">
              Start tracking your job applications here. Save the job description when you add one — you&apos;ll need it when the interview call comes.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Add Your First Application
            </button>
          </div>
        )}

        {/* Kanban */}
        <div className={`flex gap-4 overflow-x-auto pb-4 ${apps.length === 0 && !showAddForm ? 'hidden' : ''}`}>
          {columns.map((col) => {
            const colApps = getApps(col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-56">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <span>{col.icon}</span>
                  <span className="text-sm font-semibold text-slate-300">{col.label}</span>
                  <span className="ml-auto text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                    {colApps.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[120px]">
                  {colApps.length === 0 && (
                    <div className="border-2 border-dashed border-slate-800 rounded-xl h-24 flex items-center justify-center text-xs text-slate-600">
                      {search ? 'No matches' : 'Empty'}
                    </div>
                  )}
                  {colApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onMove={(newStatus) => moveApp(app.id, newStatus)}
                      onRemove={() => removeApp(app.id)}
                      onClick={() => router.push(`/applications/${app.id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary — only show when there are applications */}
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-6 text-center ${apps.length === 0 && !showAddForm ? 'hidden' : ''}`}>
          {columns.map((col) => (
            <div key={col.id} className="flex-1">
              <div className="text-lg font-bold text-white">{getApps(col.id).length}</div>
              <div className="text-xs text-slate-500">{col.icon} {col.label}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
