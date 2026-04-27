'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { PublicRoute } from '@/components/auth-guard';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setErrorMsg(null);

    const result = await forgotPassword(email);
    if (result.success) {
      setSuccess(true);
    } else {
      setErrorMsg(result.error || 'Failed to send recovery email. Please verify the address.');
    }
  };

  return (
    <PublicRoute>
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 text-zinc-100 selection:bg-emerald-500/30">
        <div className="w-full max-w-md space-y-8 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center relative">
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent sm:text-4xl">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              We'll send you an email containing instructions to reset your password.
            </p>
          </div>

          {success ? (
            <div className="space-y-6 text-center mt-6">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-100">Check your inbox</h3>
                <p className="text-sm text-zinc-400">
                  We've sent a password recovery link to <span className="font-medium text-zinc-200">{email}</span>.
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition duration-150"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 pl-10 pr-4 text-zinc-200 placeholder-zinc-600 outline-none transition duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
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
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition duration-150"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicRoute>
  );
}
