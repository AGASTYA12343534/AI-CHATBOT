'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function RootPage() {
  const router = useRouter();
  const { user, loading, refreshSession } = useAuthStore();

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm font-medium tracking-wide text-zinc-400">Redirecting to OmniAI...</p>
      </div>
    </div>
  );
}
