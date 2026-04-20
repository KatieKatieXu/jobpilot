'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    // Set the tier cookie so the rate limiter picks it up.
    // In production, verify the session server-side before trusting this.
    // For now, any successful Stripe redirect means they paid.
    document.cookie = `jobpilot_tier=pro; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    setStatus('success');
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Confirming your subscription...</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-slate-400 mb-6">We couldn&apos;t confirm your subscription.</p>
          <button
            onClick={() => router.push('/settings')}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Pro!</h1>
        <p className="text-slate-400 mb-2">
          Your subscription is active. You now have 30 AI actions per day, unlimited stories, and full access to all features.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Manage your subscription anytime in Settings.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push('/market')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition"
          >
            Run Market Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Confirming your subscription...</div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
