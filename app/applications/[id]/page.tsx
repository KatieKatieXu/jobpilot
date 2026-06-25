'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useSupabase } from '@/app/hooks/useSupabase';
import { getApplicationById, updateApplication, deleteApplication } from '@/app/lib/db';

type Column = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';

const statusConfig: Record<Column, { label: string; icon: string; color: string }> = {
  saved: { label: 'Saved', icon: '📋', color: 'bg-slate-600' },
  applied: { label: 'Applied', icon: '📤', color: 'bg-blue-600' },
  interviewing: { label: 'Interviewing', icon: '📞', color: 'bg-amber-600' },
  offer: { label: 'Offer', icon: '🎉', color: 'bg-green-600' },
  rejected: { label: 'Rejected', icon: '❌', color: 'bg-red-600' },
};

const allStatuses: Column[] = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

interface ApplicationDetail {
  id: string;
  company: string;
  role: string;
  date: string;
  status: Column;
  notes: string;
  jobDescription: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): ApplicationDetail {
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

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useSupabase();
  const appId = params.id as string;

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Editing state
  const [editing, setEditing] = useState<'notes' | 'jd' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Load application — try localStorage cache first for instant render, then Supabase
  useEffect(() => {
    let cancelled = false;

    // Instant load from cache
    try {
      const cached = localStorage.getItem('jobpilot_apps_cache');
      if (cached) {
        const apps = JSON.parse(cached);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const found = apps.find((a: any) => a.id === appId);
        if (found && !cancelled) {
          setApp(normalize(found));
          setLoading(false);
        }
      }
    } catch {}

    // Authoritative load from Supabase
    (async () => {
      const data = await getApplicationById(supabase, appId);
      if (cancelled) return;
      if (data) {
        setApp(normalize(data));
      } else if (!app) {
        setNotFound(true);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, appId]);

  const handleStatusChange = useCallback(async (newStatus: Column) => {
    if (!app) return;
    setApp({ ...app, status: newStatus });
    await updateApplication(supabase, app.id, { status: newStatus });
    // Update cache
    try {
      const cached = localStorage.getItem('jobpilot_apps_cache');
      if (cached) {
        const apps = JSON.parse(cached);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = apps.map((a: any) => a.id === app.id ? { ...a, status: newStatus } : a);
        localStorage.setItem('jobpilot_apps_cache', JSON.stringify(updated));
      }
    } catch {}
  }, [app, supabase]);

  const startEdit = useCallback((field: 'notes' | 'jd') => {
    if (!app) return;
    setEditing(field);
    setEditValue(field === 'notes' ? app.notes : app.jobDescription);
  }, [app]);

  const saveEdit = useCallback(async () => {
    if (!app || !editing) return;
    setSaving(true);
    const updates = editing === 'notes'
      ? { notes: editValue }
      : { jobDescription: editValue };

    const updatedApp = { ...app, ...(editing === 'notes' ? { notes: editValue } : { jobDescription: editValue }) };
    setApp(updatedApp);
    setEditing(null);

    await updateApplication(supabase, app.id, updates);

    // Update cache
    try {
      const cached = localStorage.getItem('jobpilot_apps_cache');
      if (cached) {
        const apps = JSON.parse(cached);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = apps.map((a: any) => a.id === app.id ? { ...a, ...updates } : a);
        localStorage.setItem('jobpilot_apps_cache', JSON.stringify(updated));
      }
    } catch {}
    setSaving(false);
  }, [app, editing, editValue, supabase]);

  const handleDelete = useCallback(async () => {
    if (!app) return;
    if (!confirm(`Remove ${app.company} — ${app.role}?`)) return;
    await deleteApplication(supabase, app.id);
    // Update cache
    try {
      const cached = localStorage.getItem('jobpilot_apps_cache');
      if (cached) {
        const apps = JSON.parse(cached);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = apps.filter((a: any) => a.id !== app.id);
        localStorage.setItem('jobpilot_apps_cache', JSON.stringify(updated));
      }
    } catch {}
    router.push('/applications');
  }, [app, supabase, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-slate-500 text-sm">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !app) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold text-slate-300 mb-2">Application not found</h2>
          <p className="text-sm text-slate-500 mb-6">It may have been removed or the link is invalid.</p>
          <button
            onClick={() => router.push('/applications')}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition"
          >
            ← Back to Board
          </button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[app.status] ?? statusConfig.applied;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back link */}
        <button
          onClick={() => router.push('/applications')}
          className="text-sm text-slate-500 hover:text-violet-400 transition flex items-center gap-1"
        >
          ← Back to Board
        </button>

        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{app.company}</h1>
              <p className="text-lg text-slate-400 mt-1">{app.role}</p>
              <p className="text-sm text-slate-600 mt-2">Applied {app.date}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Status selector */}
              <select
                value={app.status}
                onChange={(e) => handleStatusChange(e.target.value as Column)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition"
              >
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {statusConfig[s].icon} {statusConfig[s].label}
                  </option>
                ))}
              </select>
              {/* Delete */}
              <button
                onClick={handleDelete}
                className="text-slate-700 hover:text-red-400 text-sm transition"
                title="Remove application"
              >
                🗑
              </button>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Job Description</h2>
            {editing !== 'jd' && (
              <button
                onClick={() => startEdit('jd')}
                className="text-xs text-violet-400 hover:text-violet-300 transition"
              >
                {app.jobDescription ? 'Edit' : '+ Add'}
              </button>
            )}
          </div>

          {editing === 'jd' ? (
            <div className="space-y-3">
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                placeholder="Paste the key requirements, responsibilities, or qualifications from the job posting..."
                rows={12}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : app.jobDescription ? (
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{app.jobDescription}</p>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600 text-sm mb-3">No job description saved yet.</p>
              <p className="text-xs text-slate-700 max-w-md mx-auto mb-4">
                Job postings often disappear after a few weeks. When you get that interview call, you&apos;ll want to review what they were looking for.
              </p>
              <button
                onClick={() => startEdit('jd')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-violet-400 text-sm rounded-lg transition border border-slate-700"
              >
                + Add Job Description
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Notes</h2>
            {editing !== 'notes' && (
              <button
                onClick={() => startEdit('notes')}
                className="text-xs text-violet-400 hover:text-violet-300 transition"
              >
                {app.notes ? 'Edit' : '+ Add'}
              </button>
            )}
          </div>

          {editing === 'notes' ? (
            <div className="space-y-3">
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                placeholder="e.g. Referral from Alex, applied via company site, recruiter reached out on LinkedIn..."
                rows={5}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : app.notes ? (
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{app.notes}</p>
          ) : (
            <p className="text-sm text-slate-600 italic">No notes yet — click &quot;+ Add&quot; to jot down referral info, how you applied, or anything you&apos;ll want to remember.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
