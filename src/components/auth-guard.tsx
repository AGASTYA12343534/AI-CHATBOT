'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: AuthGuardProps) {
  const { user, loading, refreshSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Check session on mount
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-zinc-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (user?.profile?.is_suspended || user?.profile?.is_banned) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-300 p-6 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-100">Account Access Suspended</h2>
        <p className="text-xs text-zinc-500 max-w-sm">This account has been suspended or banned by the administration. Please contact support if you believe this is in error.</p>
        <button
          onClick={async () => {
            await useAuthStore.getState().logout();
            router.replace('/login');
          }}
          className="bg-zinc-900 border border-zinc-800 text-xs px-4 py-2 rounded-lg hover:text-white transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: AuthGuardProps) {
  const { user, loading, refreshSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow rendering if user is not authenticated
  return !user ? <>{children}</> : null;
}
