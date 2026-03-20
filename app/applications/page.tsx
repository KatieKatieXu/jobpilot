'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface Application {
  id: number;
  company: string;
  role: string;
  date: string;
  status: Column;
}

type Column = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';

const columns: { id: Column; label: string; icon: string }[] = [
  { id: 'saved', label: 'Saved', icon: '📋' },
  { id: 'applied', label: 'Applied', icon: '📤' },
  { id: 'interviewing', label: 'Interviewing', icon: '📞' },
  { id: 'offer', label: 'Offer', icon: '🎉' },
  { id: 'rejected', label: 'Rejected', icon: '❌' },
];

const seedApplications: Application[] = [
  {
    id: 1,
    company: 'Anthropic',
    role: 'Product Designer',
    date: '2026-03-17',
    status: 'applied',
  },
];

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>(seedApplications);

  useEffect(() => {
    const saved = localStorage.getItem('jobpilot_applications');
    if (saved) {
      try { setApps(JSON.parse(saved)); } catch {}
    }
  }, []);

  const moveApp = (id: number, newStatus: Column) => {
    const updated = apps.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
    setApps(updated);
    localStorage.setItem('jobpilot_applications', JSON.stringify(updated));

    // Sync applied badge on jobs board
    const savedApplied = localStorage.getItem('jobpilot_applied');
    let appliedIds: number[] = [];
    try { appliedIds = savedApplied ? JSON.parse(savedApplied) : []; } catch {}
    const appliedSet = new Set(appliedIds);
    if (newStatus === 'rejected' || newStatus === 'saved') {
      appliedSet.delete(id);
    } else {
      appliedSet.add(id);
    }
    localStorage.setItem('jobpilot_applied', JSON.stringify([...appliedSet]));
  };

  const removeApp = (id: number) => {
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
    localStorage.setItem('jobpilot_applications', JSON.stringify(updated));
    // Remove from applied set too
    const savedApplied = localStorage.getItem('jobpilot_applied');
    let appliedIds: number[] = [];
    try { appliedIds = savedApplied ? JSON.parse(savedApplied) : []; } catch {}
    localStorage.setItem('jobpilot_applied', JSON.stringify(appliedIds.filter((i) => i !== id)));
  };

  const getApps = (col: Column) => apps.filter((a) => a.status === col);

  return (
    <AppLayout>
      <div className="max-w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="text-slate-400 mt-1">Track your job application pipeline.</p>
        </div>

        {/* Kanban */}
        <div className="flex gap-4 overflow-x-auto pb-4">
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
                      <div className="text-xs text-slate-600 mb-3">
                        {app.date}
                      </div>
                      {/* Move dropdown */}
                      <select
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-violet-500 cursor-pointer"
                        value={app.status}
                        onChange={(e) => moveApp(app.id, e.target.value as Column)}
                      >
                        <option value="" disabled>Move to →</option>
                        {columns.filter((c) => c.id !== app.status).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.label}
                          </option>
                        ))}
                        <option value={app.status} disabled>— current —</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-6 text-center">
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
