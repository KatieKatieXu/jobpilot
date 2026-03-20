'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';

export default function SettingsPage() {
  const [cleared, setCleared] = useState(false);

  const exportProfile = () => {
    const profile = localStorage.getItem('jobpilot_profile');
    const apps = localStorage.getItem('jobpilot_applications');
    const data = {
      profile: profile ? JSON.parse(profile) : null,
      applications: apps ? JSON.parse(apps) : null,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobpilot-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    if (window.confirm('Are you sure? This will delete all your profile data and applications.')) {
      localStorage.removeItem('jobpilot_profile');
      localStorage.removeItem('jobpilot_applications');
      localStorage.removeItem('jobpilot_jobs');
      localStorage.removeItem('jobpilot_analysis');
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your Jobpilot data.</p>
        </div>

        {/* Data management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Data Management</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-200">Export Profile</p>
                <p className="text-xs text-slate-500">Download your profile and applications as JSON</p>
              </div>
              <button
                onClick={exportProfile}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition"
              >
                Export →
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-red-400">Clear All Data</p>
                <p className="text-xs text-slate-500">Permanently delete all profile and application data</p>
              </div>
              <button
                onClick={clearData}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-400 border border-red-800 text-sm font-medium rounded-lg transition"
              >
                {cleared ? 'Cleared ✓' : 'Clear Data'}
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">About Jobpilot</h2>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✈️</span>
              <div>
                <p className="font-semibold text-white">Jobpilot v0.1.0</p>
                <p className="text-xs">AI-powered job search and application tracker</p>
              </div>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 mb-0.5">Built with</p>
                <p className="text-slate-300">Next.js 16 + TypeScript</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 mb-0.5">Styling</p>
                <p className="text-slate-300">Tailwind CSS v4</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 mb-0.5">Storage</p>
                <p className="text-slate-300">localStorage (client-only)</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 mb-0.5">Powered by</p>
                <p className="text-slate-300">Cleo 🦾</p>
              </div>
            </div>
            <div className="h-px bg-slate-800" />
            <p className="text-xs text-slate-600">
              All data is stored locally in your browser. No data is sent to any server.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
