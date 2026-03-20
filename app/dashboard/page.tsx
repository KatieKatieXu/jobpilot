'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';

interface Profile {
  fullName?: string;
  currentTitle?: string;
  location?: string;
  yearsExperience?: string;
  workStyle?: string;
  targetRoles?: string[];
}

const statCards = [
  { label: 'Jobs Found', value: '3', icon: '💼', color: 'text-violet-400' },
  { label: 'Applications Sent', value: '1', icon: '📤', color: 'text-blue-400' },
  { label: 'Interviews', value: '0', icon: '📞', color: 'text-green-400' },
  { label: 'Profile Strength', value: '72%', icon: '⚡', color: 'text-yellow-400' },
];

const activity = [
  { text: 'Job match found: Anthropic Product Designer (95%)', time: '2h ago', icon: '🎯' },
  { text: 'Application submitted: Anthropic Product Designer', time: '1d ago', icon: '📤' },
  { text: 'Profile created', time: '1d ago', icon: '✅' },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    const saved = localStorage.getItem('jobpilot_profile');
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile.fullName ? `Welcome back, ${profile.fullName.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          <p className="text-slate-400 mt-1">Here's what's happening with your job search.</p>
        </div>

        {/* Profile summary card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-2xl">
            {profile.fullName ? profile.fullName[0] : '👤'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">{profile.fullName || 'Your Name'}</h2>
            <p className="text-slate-400 text-sm">{profile.currentTitle || 'Add your title'}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              {profile.location && <span>📍 {profile.location}</span>}
              {profile.yearsExperience && <span>🗓 {profile.yearsExperience} yrs exp</span>}
              {profile.workStyle && <span>🏠 {profile.workStyle}</span>}
            </div>
          </div>
          <Link href="/profile" className="text-violet-400 hover:text-violet-300 text-sm font-medium transition">
            Edit Profile →
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>{stat.icon}</span>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-800 last:border-0">
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">{item.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/jobs" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition group">
                <span className="text-xl">🔍</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Run Job Search</p>
                  <p className="text-xs text-slate-500">Find new matches</p>
                </div>
              </Link>
              <Link href="/profile" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                <span className="text-xl">👤</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">Update Profile</p>
                  <p className="text-xs text-slate-500">Keep it fresh</p>
                </div>
              </Link>
              <Link href="/applications" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
                <span className="text-xl">📋</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">View Applications</p>
                  <p className="text-xs text-slate-500">Track your pipeline</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
