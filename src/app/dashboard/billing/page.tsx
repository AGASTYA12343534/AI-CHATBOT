'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import Sidebar from '@/components/sidebar';
import { insforge } from '@/lib/insforge';
import { useAuthStore } from '@/store/auth-store';
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Loader2,
  ArrowLeft
} from 'lucide-react';

function BillingContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [subInfo, setSubInfo] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user?.id) return;
    try {
      const { data } = await insforge.database
        .from('user_subscriptions')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSubInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  useEffect(() => {
    const status = searchParams.get('status');
    const tier = searchParams.get('tier');
    const isSandbox = searchParams.get('sandbox');

    if (status === 'success') {
      setStatusMsg(`Subscription successfully upgraded to ${tier?.toUpperCase()}! ${isSandbox ? '(Sandbox Mode)' : ''}`);
    } else if (status === 'cancel') {
      setStatusMsg('Checkout canceled.');
    } else if (status === 'canceled') {
      setStatusMsg('Subscription successfully canceled.');
    }
  }, [searchParams]);

  const handleCheckout = async (tier: 'pro' | 'enterprise') => {
    setLoading(true);
    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to initialize checkout');

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      alert(`Checkout error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to open billing portal');

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      alert(`Portal error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const activePlan = subInfo?.plan || 'free';
  const messageCount = subInfo?.message_count || 0;
  const maxMessages = subInfo?.max_messages || 50;
  const percentage = Math.min((messageCount / maxMessages) * 100, 100);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/10 overflow-y-auto">
        {/* Header */}
        <header className="px-6 py-4 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Subscription Plans & Billing
              </h1>
              <p className="text-[10px] text-zinc-500">Manage payment details, subscription status, and usage quotas</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
          {/* Notification Banner */}
          {statusMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-between">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg(null)} className="hover:text-white">✕</button>
            </div>
          )}

          {/* Active quota overview */}
          <div className="bg-zinc-900/40 backdrop-blur border border-zinc-850 p-6 rounded-2xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Current Plan Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-2xl font-black text-zinc-150 capitalize flex items-center gap-2">
                  {activePlan} Tier
                  {activePlan !== 'free' && <Shield className="h-5 w-5 text-emerald-500 fill-emerald-500/10" />}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Status: <span className="text-emerald-400 font-semibold uppercase">{subInfo?.status || 'active'}</span></p>
              </div>

              {/* Progress limit bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-400">
                  <span>Message Quota Usage</span>
                  <span>{messageCount} / {maxMessages} messages</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {activePlan !== 'free' && (
              <div className="pt-2">
                <button
                  onClick={handlePortal}
                  disabled={loading}
                  className="flex items-center gap-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 px-4 py-2 rounded-lg text-xs font-semibold hover:text-white transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                  Manage Subscription / Cancel
                </button>
              </div>
            )}
          </div>

          {/* Pricing cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Card */}
            <div className={`border rounded-2xl p-6 flex flex-col justify-between ${
              activePlan === 'free' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-850 bg-zinc-900/10'
            }`}>
              <div>
                <h3 className="text-sm font-bold text-zinc-300">Free Tier</h3>
                <div className="mt-2.5 mb-4">
                  <span className="text-3xl font-black">$0</span>
                  <span className="text-xs text-zinc-500"> / month</span>
                </div>
                <p className="text-xs text-zinc-400 mb-6">Basic chatbot interface to test standard capabilities.</p>
                <ul className="space-y-2.5 text-xs text-zinc-400">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> 50 messages / month</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Standard Google Gemini access</li>
                  <li className="flex items-center gap-2 text-zinc-650">✕ Advanced reasoning models</li>
                  <li className="flex items-center gap-2 text-zinc-650">✕ Comparison mode</li>
                  <li className="flex items-center gap-2 text-zinc-650">✕ Document RAG vector upload</li>
                </ul>
              </div>
              <button
                disabled
                className="mt-8 w-full py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-bold text-zinc-500 cursor-not-allowed"
              >
                {activePlan === 'free' ? 'Active Plan' : 'Free tier'}
              </button>
            </div>

            {/* Pro Card */}
            <div className={`border rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden ${
              activePlan === 'pro' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30 shadow-xl'
            }`}>
              <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-bl-lg">
                Popular
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-150 flex items-center gap-1.5">
                  Pro Plan
                  <Zap className="h-4 w-4 text-emerald-400 fill-emerald-400/20" />
                </h3>
                <div className="mt-2.5 mb-4">
                  <span className="text-3xl font-black">$20</span>
                  <span className="text-xs text-zinc-500"> / month</span>
                </div>
                <p className="text-xs text-zinc-400 mb-6">Unlocks all models, RAG vector context, and agent execution.</p>
                <ul className="space-y-2.5 text-xs text-zinc-400">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> 500 messages / month</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Access to Claude 3.5 Sonnet, GPT-4o</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> DeepSeek V3 & Grok 2 support</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Multi-Agent Chain executions</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Document RAG vector upload</li>
                </ul>
              </div>
              <button
                onClick={() => handleCheckout('pro')}
                disabled={activePlan === 'pro' || loading}
                className="mt-8 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
              >
                {activePlan === 'pro' ? 'Active Plan' : 'Upgrade to Pro'}
              </button>
            </div>

            {/* Enterprise Card */}
            <div className={`border rounded-2xl p-6 flex flex-col justify-between ${
              activePlan === 'enterprise' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-850 bg-zinc-900/10'
            }`}>
              <div>
                <h3 className="text-sm font-bold text-zinc-300">Enterprise</h3>
                <div className="mt-2.5 mb-4">
                  <span className="text-3xl font-black">$150</span>
                  <span className="text-xs text-zinc-500"> / month</span>
                </div>
                <p className="text-xs text-zinc-400 mb-6">Designed for enterprise developers and scaling agents.</p>
                <ul className="space-y-2.5 text-xs text-zinc-400">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Unlimited messages</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Priority API response streaming</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Multi-user seat workspaces</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Advanced vector context limits</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Dedicated SLA support channels</li>
                </ul>
              </div>
              <button
                onClick={() => handleCheckout('enterprise')}
                disabled={activePlan === 'enterprise' || loading}
                className="mt-8 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition disabled:opacity-50"
              >
                {activePlan === 'enterprise' ? 'Active Plan' : 'Purchase Enterprise'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }>
        <BillingContent />
      </Suspense>
    </ProtectedRoute>
  );
}
