'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getApplications, saveApplications } from '@/app/lib/db';

interface Application {
  id: string | number;
  company: string;
  role: string;
  date: string;
  status: Column;
  notes?: string;
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
  
  const currentCol = columns.find((c) => c.id === currentStatus);
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

const DRAFT_KEY = 'jobpilot_app_draft';

function emptyDraft() {
  return {
    company: '',
    role: '',
    date: new Date().toISOString().split('T')[0],
    status: 'applied' as Column,
    notes: '',
  };
}

export default function ApplicationsPage() {
  const supabase = useSupabase();
  const [apps, setApps] = useState<Application[]>([]);

  // Add Application form state — restore draft from localStorage
  const [showAddForm, setShowAddForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? true : false;
    } catch { return false; }
  });
  const [addForm, setAddForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...emptyDraft(), ...saved };
      }
    } catch {}
    return emptyDraft();
  });
  const [addFormSaving, setAddFormSaving] = useState(false);

  // Persist draft to localStorage whenever form changes
  const updateForm = useCallback((updater: (prev: typeof addForm) => typeof addForm) => {
    setAddForm((prev) => {
      const next = updater(prev);
      // Save draft if any field has content
      if (next.company || next.role || next.notes) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getApplications(supabase);
      if (cancelled) return;
      setApps(loaded.map(normalizeApp));
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Helper to map apps to the shape saveApplications expects
  const toDbShape = (list: Application[]) =>
    list.map((a) => ({
      id: a.id,
      jobTitle: a.role,
      company: a.company,
      status: a.status,
      appliedAt: a.date ? `${a.date}T00:00:00.000Z` : new Date().toISOString(),
      notes: a.notes ?? '',
    }));

  const moveApp = useCallback((id: string | number, newStatus: Column) => {
    setApps((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
      saveApplications(supabase, toDbShape(updated));

      // Sync applied badge on jobs board (localStorage only — jobs page reads this)
      if (!supabase) {
        const savedApplied = localStorage.getItem('jobpilot_applied');
        let appliedIds: (string | number)[] = [];
        try { appliedIds = savedApplied ? JSON.parse(savedApplied) : []; } catch {}
        const appliedSet = new Set(appliedIds);
        if (newStatus === 'rejected' || newStatus === 'saved') {
          appliedSet.delete(id);
        } else {
          appliedSet.add(id);
        }
        localStorage.setItem('jobpilot_applied', JSON.stringify([...appliedSet]));
      }
      return updated;
    });
  }, [supabase]);

  const removeApp = useCallback((id: string | number) => {
    setApps((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveApplications(supabase, toDbShape(updated));
      // Remove from applied set too (localStorage only)
      if (!supabase) {
        const savedApplied = localStorage.getItem('jobpilot_applied');
        let appliedIds: (string | number)[] = [];
        try { appliedIds = savedApplied ? JSON.parse(savedApplied) : []; } catch {}
        localStorage.setItem('jobpilot_applied', JSON.stringify(appliedIds.filter((i) => i !== id)));
      }
      return updated;
    });
  }, [supabase]);

  const addApplication = useCallback(async () => {
    if (!addForm.company.trim() || !addForm.role.trim()) return;
    setAddFormSaving(true);
    try {
      const newApp: Application = {
        id: crypto.randomUUID(),
        company: addForm.company.trim(),
        role: addForm.role.trim(),
        date: addForm.date || new Date().toISOString().split('T')[0],
        status: addForm.status,
        notes: addForm.notes.trim(),
      };
      const updated = [newApp, ...apps];
      setApps(updated);

      // Persist — map to the shape saveApplications expects
      await saveApplications(
        supabase,
        updated.map((a) => ({
          id: a.id,
          jobTitle: a.role,
          company: a.company,
          status: a.status,
          appliedAt: a.date ? `${a.date}T00:00:00.000Z` : new Date().toISOString(),
          notes: a.notes ?? '',
        }))
      );

      // Reset form + clear draft
      clearDraft();
      setAddForm(emptyDraft());
      setShowAddForm(false);
    } finally {
      setAddFormSaving(false);
    }
  }, [addForm, apps, supabase, clearDraft]);

  const getApps = (col: Column) => apps.filter((a) => a.status === col);

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

        {/* Add Application form — inline, collapsible */}
        {showAddForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Add external application</h3>
            <p className="text-xs text-slate-500">Track a job you applied to outside the platform.</p>
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
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
              placeholder="Notes (optional) — e.g. referral from Alex, applied via company site"
              rows={2}
              value={addForm.notes}
              onChange={(e) => updateForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                onClick={addApplication}
                disabled={addFormSaving || !addForm.company.trim() || !addForm.role.trim()}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition"
              >
                {addFormSaving ? 'Saving...' : 'Save'}
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
            <p className="text-slate-500 text-sm mb-6">
              Start tracking your job applications — add ones you&apos;ve already submitted, or mark jobs as applied from the Job Board.
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
                      Empty
                    </div>
                  )}
                  {colApps.map((app) => (
                    <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 group">
                      <div className="flex items-start justify-between mb-0.5">
                        <div className="text-sm font-semibold text-white">{app.company}</div>
                        <button
                          onClick={() => removeApp(app.id)}
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
                      <div className="text-xs text-slate-600 mb-3">
                        {app.date}
                      </div>
                      {/* Move dropdown */}
                      <StatusDropdown
                        currentStatus={app.status}
                        onMove={(newStatus) => moveApp(app.id, newStatus)}
                      />
                    </div>
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
