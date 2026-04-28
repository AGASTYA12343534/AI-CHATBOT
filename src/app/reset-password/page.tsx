'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Lock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const { resetPassword, loading } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const status = searchParams.get('insforge_status');
  const errorParam = searchParams.get('insforge_error');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam ? `Password reset link error: ${errorParam}` : null
  );
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Missing reset token. Please request another password reset email.');
      return;
    }
    if (!password || !confirmPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    setErrorMsg(null);

    const result = await resetPassword(password, token);
    if (result.success) {
      setSuccess(true);
    } else {
      setErrorMsg(result.error || 'Failed to reset password. The link may have expired.');
    }
  };

  const isLinkInvalid = !token && status !== 'ready';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 text-zinc-100 selection:bg-emerald-500/30">
      <div className="w-full max-w-md space-y-8 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center relative">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent sm:text-4xl">
            New Password
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Please enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="space-y-6 text-center mt-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-zinc-100">Password Changed</h3>
              <p className="text-sm text-zinc-400">
                Your password has been updated successfully.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => router.push('/login')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01]"
              >
                Go to Sign In
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : isLinkInvalid ? (
          <div className="space-y-6 text-center mt-6">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-zinc-100">Invalid Reset Link</h3>
              <p className="text-sm text-zinc-400">
                This password reset link is invalid or expired. Please request a new one.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={() => router.push('/forgot-password')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition duration-150"
              >
                Request New Link
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-4 text-zinc-200 placeholder-zinc-600 outline-none transition duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-4 text-zinc-200 placeholder-zinc-600 outline-none transition duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-sm font-medium tracking-wide text-zinc-400">Loading token parameters...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
