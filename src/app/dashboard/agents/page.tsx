'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import Sidebar from '@/components/sidebar';
import { insforge } from '@/lib/insforge';
import {
  Brain,
  Code2,
  FileCheck2,
  Cpu,
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function AgentsPage() {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'research' | 'code' | 'review' | 'done'>('idle');
  const [outputs, setOutputs] = useState<{ research: string; code: string; review: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'research' | 'code' | 'review'>('research');

  const router = useRouter();

  const handleRunAgents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim() || loading) return;

    setLoading(true);
    setOutputs(null);
    setCurrentStep('research');

    try {
      const token = (insforge.auth as any).getAccessToken();

      // Trigger agent orchestration
      // We simulate step transitions in the UI for premium UX feel
      const triggerTransition = (step: 'code' | 'review' | 'done', delay: number) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            setCurrentStep(step);
            resolve();
          }, delay);
        });
      };

      const fetchPromise = fetch('/api/chat/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: task.trim() }),
      });

      await triggerTransition('code', 2500);
      await triggerTransition('review', 3000);

      const response = await fetchPromise;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Agent chain failed');

      setOutputs(data);
      setCurrentStep('done');
      setActiveTab('review');
    } catch (err: any) {
      alert(`Agent execution failed: ${err.message}`);
      setCurrentStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : 'code';
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs">
            <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 text-zinc-550 border-b border-zinc-850">
              <span className="uppercase text-[10px] font-bold tracking-wider">{language || 'code'}</span>
            </div>
            <pre className="overflow-x-auto p-4 text-emerald-400">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return (
        <p key={index} className="whitespace-pre-wrap mb-3 text-zinc-300 leading-relaxed text-xs">
          {part}
        </p>
      );
    });
  };

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
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  Multi-Agent Intelligence System
                </h1>
                <p className="text-[10px] text-zinc-500">Research, implement, and review coding requirements using chained agents</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
            {/* Input Form Card */}
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-800/80 p-5 rounded-2xl">
              <form onSubmit={handleRunAgents} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Submit Development Task
                  </label>
                  <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="Describe a coding or software engineering task... (e.g. Write a TypeScript middleware that rate limits Express requests based on IP using Redis)"
                    rows={3}
                    className="w-full text-sm bg-zinc-950/50 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-emerald-500 transition placeholder-zinc-650"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!task.trim() || loading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Running Chain...
                      </>
                    ) : (
                      <>
                        Launch Agent Chain
                        <Send className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Visual Timeline Stepper */}
            {currentStep !== 'idle' && (
              <div className="bg-zinc-900/20 border border-zinc-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between max-w-md mx-auto">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border transition ${
                        currentStep === 'research'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 animate-pulse'
                          : currentStep === 'code' || currentStep === 'review' || currentStep === 'done'
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-850 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      <Brain className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">Research</span>
                  </div>

                  <ArrowRight className={`h-4 w-4 text-zinc-700 ${currentStep === 'research' ? 'animate-pulse' : ''}`} />

                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border transition ${
                        currentStep === 'code'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 animate-pulse'
                          : currentStep === 'review' || currentStep === 'done'
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-850 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      <Code2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">Coding</span>
                  </div>

                  <ArrowRight className={`h-4 w-4 text-zinc-700 ${currentStep === 'code' ? 'animate-pulse' : ''}`} />

                  {/* Step 3 */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border transition ${
                        currentStep === 'review'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 animate-pulse'
                          : currentStep === 'done'
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-850 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">Review</span>
                  </div>
                </div>
              </div>
            )}

            {/* Outputs Cards tabs */}
            {outputs && (
              <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col">
                <div className="flex border-b border-zinc-850 bg-zinc-950">
                  <button
                    onClick={() => setActiveTab('research')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
                      activeTab === 'research'
                        ? 'border-emerald-500 text-emerald-400 bg-zinc-900/30'
                        : 'border-transparent text-zinc-450 hover:text-zinc-200'
                    }`}
                  >
                    1. Research (Gemini)
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
                      activeTab === 'code'
                        ? 'border-emerald-500 text-emerald-400 bg-zinc-900/30'
                        : 'border-transparent text-zinc-450 hover:text-zinc-200'
                    }`}
                  >
                    2. Coding (Claude)
                  </button>
                  <button
                    onClick={() => setActiveTab('review')}
                    className={`flex-1 py-3.5 text-xs font-bold text-center border-b-2 transition ${
                      activeTab === 'review'
                        ? 'border-emerald-500 text-emerald-400 bg-zinc-900/30'
                        : 'border-transparent text-zinc-450 hover:text-zinc-200'
                    }`}
                  >
                    3. Review & Polish (GPT)
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[500px]">
                  {activeTab === 'research' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        <Brain className="h-4 w-4 text-blue-400" />
                        Gemini Feasibility Report
                      </div>
                      {renderMarkdown(outputs.research)}
                    </div>
                  )}

                  {activeTab === 'code' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        <Code2 className="h-4 w-4 text-amber-400" />
                        Claude Draft Implementation
                      </div>
                      {renderMarkdown(outputs.code)}
                    </div>
                  )}

                  {activeTab === 'review' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        <FileCheck2 className="h-4 w-4 text-emerald-400" />
                        GPT Peer Review & Verification
                      </div>
                      {renderMarkdown(outputs.review)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
