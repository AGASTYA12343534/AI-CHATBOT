'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import Sidebar from '@/components/sidebar';
import { insforge } from '@/lib/insforge';
import { useAuthStore } from '@/store/auth-store';
import {
  BarChart2,
  MessageSquare,
  Clock,
  Sparkles,
  ArrowLeft,
  Activity,
  Zap
} from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    chatCount: 0,
    messageCount: 0,
    avgLatency: 0,
    modelDistribution: {
      gemini: 0,
      claude: 0,
      gpt: 0,
      llama: 0
    }
  });

  const router = useRouter();

  const loadAnalytics = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Chat count
      const { count: chats } = await insforge.database
        .from('chats')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Message count
      const { count: msgs } = await insforge.database
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // 3. Fetch Timing and Models distribution
      const { data: messageDetails } = await insforge.database
        .from('messages')
        .select('model, response_time_ms');

      let totalTime = 0;
      let timeCount = 0;
      const modelCounts = { gemini: 0, claude: 0, gpt: 0, llama: 0 };

      if (messageDetails) {
        messageDetails.forEach((m: any) => {
          if (m.response_time_ms) {
            totalTime += m.response_time_ms;
            timeCount++;
          }
          if (m.model) {
            const mLower = m.model.toLowerCase();
            if (mLower.includes('gemini')) modelCounts.gemini++;
            else if (mLower.includes('claude')) modelCounts.claude++;
            else if (mLower.includes('gpt')) modelCounts.gpt++;
            else if (mLower.includes('llama')) modelCounts.llama++;
          }
        });
      }

      setStats({
        chatCount: chats || 0,
        messageCount: msgs || 0,
        avgLatency: timeCount > 0 ? totalTime / timeCount : 0,
        modelDistribution: modelCounts
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const totalModelCalls = Object.values(stats.modelDistribution).reduce((a, b) => a + b, 0) || 1;
  const geminiPercentage = Math.round((stats.modelDistribution.gemini / totalModelCalls) * 100);
  const claudePercentage = Math.round((stats.modelDistribution.claude / totalModelCalls) * 100);
  const gptPercentage = Math.round((stats.modelDistribution.gpt / totalModelCalls) * 100);
  const llamaPercentage = Math.round((stats.modelDistribution.llama / totalModelCalls) * 100);

  return (
    <ProtectedRoute>
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
                  <BarChart2 className="h-4 w-4 text-emerald-400" />
                  Usage Analytics
                </h1>
                <p className="text-[10px] text-zinc-500">Monitor token activity, latencies, and total requests</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
            {loading ? (
              <div className="text-center py-20 text-xs text-zinc-500">Loading analytic charts...</div>
            ) : (
              <>
                {/* Stats cards row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="bg-zinc-900/35 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-500">Total Conversations</p>
                      <p className="text-xl font-black text-zinc-200 mt-1">{stats.chatCount}</p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-zinc-900/35 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-500">Messages Count</p>
                      <p className="text-xl font-black text-zinc-200 mt-1">{stats.messageCount}</p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-zinc-900/35 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-500">Average Latency</p>
                      <p className="text-xl font-black text-zinc-200 mt-1">{(stats.avgLatency / 1000).toFixed(2)}s</p>
                    </div>
                  </div>
                </div>

                {/* Model distributions graph */}
                <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-400" />
                      Model Distribution Breakdown
                    </h2>
                    <span className="text-[10px] text-zinc-500">Based on historical chat completions</span>
                  </div>

                  <div className="space-y-4">
                    {/* Gemini */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400">
                        <span>Google Gemini</span>
                        <span>{geminiPercentage}% ({stats.modelDistribution.gemini} calls)</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${geminiPercentage}%` }}></div>
                      </div>
                    </div>

                    {/* Claude */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400">
                        <span>Anthropic Claude</span>
                        <span>{claudePercentage}% ({stats.modelDistribution.claude} calls)</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${claudePercentage}%` }}></div>
                      </div>
                    </div>

                    {/* GPT */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400">
                        <span>OpenAI GPT</span>
                        <span>{gptPercentage}% ({stats.modelDistribution.gpt} calls)</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${gptPercentage}%` }}></div>
                      </div>
                    </div>

                    {/* Llama */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-zinc-400">
                        <span>Meta Llama</span>
                        <span>{llamaPercentage}% ({stats.modelDistribution.llama} calls)</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${llamaPercentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
