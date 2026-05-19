'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import Sidebar from '@/components/sidebar';
import { insforge } from '@/lib/insforge';
import {
  Sparkles,
  Zap,
  Clock,
  Coins,
  Send,
  ArrowLeft,
  Bot,
  Copy
} from 'lucide-react';

export default function ComparePage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const router = useRouter();

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResults(null);

    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/chat/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Comparison query failed');

      setResults(data.results);
    } catch (err: any) {
      alert(`Comparison Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : 'code';
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <div key={index} className="my-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-[11px]">
            <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5 text-zinc-500">
              <span className="uppercase">{language || 'code'}</span>
            </div>
            <pre className="overflow-x-auto p-3 text-emerald-400">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return (
        <p key={index} className="whitespace-pre-wrap mb-2 text-zinc-300 leading-relaxed text-xs">
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
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  AI Comparison Mode
                </h1>
                <p className="text-[10px] text-zinc-500">Benchmark outputs from multiple providers simultaneously</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
            {/* Input card */}
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-800 p-5 rounded-2xl">
              <form onSubmit={handleCompare} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Enter Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Compare how different models answer a specific prompt... (e.g. Write a quicksort algorithm in python)"
                    rows={3}
                    className="w-full text-sm bg-zinc-950/50 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-emerald-500 transition placeholder-zinc-650"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!prompt.trim() || loading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Benchmarking...
                      </>
                    ) : (
                      <>
                        Compare Models
                        <Send className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gemini Column */}
              <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-200">Google Gemini</span>
                  </div>
                  <span className="text-[9px] uppercase bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full">Fast</span>
                </div>

                <div className="flex-1 p-4 min-h-[300px] overflow-y-auto">
                  {loading && (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                      <div className="h-4 bg-zinc-800 rounded"></div>
                      <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                    </div>
                  )}

                  {results?.gemini?.success ? (
                    renderContent(results.gemini.content)
                  ) : results?.gemini ? (
                    <p className="text-xs text-red-400">{results.gemini.error}</p>
                  ) : !loading && (
                    <p className="text-xs text-zinc-600 text-center mt-20">Awaiting benchmark query...</p>
                  )}
                </div>

                {results?.gemini?.success && (
                  <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-850 text-[10px] text-zinc-400 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-blue-400" />{(results.gemini.responseTimeMs / 1000).toFixed(2)}s</span>
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-blue-400" />{results.gemini.promptTokens + results.gemini.completionTokens} tokens</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(results.gemini.content);
                        alert('Copied Gemini answer.');
                      }}
                      className="p-1 hover:bg-zinc-800 rounded hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Claude Column */}
              <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-200">Anthropic Claude</span>
                  </div>
                  <span className="text-[9px] uppercase bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full">Creative</span>
                </div>

                <div className="flex-1 p-4 min-h-[300px] overflow-y-auto">
                  {loading && (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                      <div className="h-4 bg-zinc-800 rounded"></div>
                      <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                    </div>
                  )}

                  {results?.claude?.success ? (
                    renderContent(results.claude.content)
                  ) : results?.claude ? (
                    <p className="text-xs text-red-400">{results.claude.error}</p>
                  ) : !loading && (
                    <p className="text-xs text-zinc-600 text-center mt-20">Awaiting benchmark query...</p>
                  )}
                </div>

                {results?.claude?.success && (
                  <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-850 text-[10px] text-zinc-400 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" />{(results.claude.responseTimeMs / 1000).toFixed(2)}s</span>
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-amber-400" />{results.claude.promptTokens + results.claude.completionTokens} tokens</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(results.claude.content);
                        alert('Copied Claude answer.');
                      }}
                      className="p-1 hover:bg-zinc-800 rounded hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* GPT Column */}
              <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
                <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-200">OpenAI GPT</span>
                  </div>
                  <span className="text-[9px] uppercase bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full">Balanced</span>
                </div>

                <div className="flex-1 p-4 min-h-[300px] overflow-y-auto">
                  {loading && (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                      <div className="h-4 bg-zinc-800 rounded"></div>
                      <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                    </div>
                  )}

                  {results?.gpt?.success ? (
                    renderContent(results.gpt.content)
                  ) : results?.gpt ? (
                    <p className="text-xs text-red-400">{results.gpt.error}</p>
                  ) : !loading && (
                    <p className="text-xs text-zinc-600 text-center mt-20">Awaiting benchmark query...</p>
                  )}
                </div>

                {results?.gpt?.success && (
                  <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-850 text-[10px] text-zinc-400 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-emerald-400" />{(results.gpt.responseTimeMs / 1000).toFixed(2)}s</span>
                      <span className="flex items-center gap-1"><Coins className="h-3 w-3 text-emerald-400" />{results.gpt.promptTokens + results.gpt.completionTokens} tokens</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(results.gpt.content);
                        alert('Copied GPT answer.');
                      }}
                      className="p-1 hover:bg-zinc-800 rounded hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
