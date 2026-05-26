'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import Sidebar from '@/components/sidebar';
import { insforge } from '@/lib/insforge';
import {
  Brain,
  Trash2,
  Plus,
  ArrowLeft,
  Settings,
  Sparkles,
  Info
} from 'lucide-react';

export default function MemoryPage() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'preference' | 'writing_style' | 'context'>('preference');
  const router = useRouter();

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/memory', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim(), category }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add memory');

      setContent('');
      fetchMemories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch(`/api/memory?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete memory');

      fetchMemories();
    } catch (err: any) {
      alert(err.message);
    }
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
                  <Brain className="h-4 w-4 text-emerald-400" />
                  Long-Term Personal Memory
                </h1>
                <p className="text-[10px] text-zinc-500">View facts and context OmniAI maintains across chats</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">
            {/* Explanatory banner */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-850 flex gap-3 text-zinc-400 text-xs leading-relaxed">
              <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                OmniAI automatically injects memories listed here into the system context for all future messages. You can explicitly list preferred programming languages, writing formats, or professional backgrounds so you do not have to repeat them.
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-zinc-900/40 backdrop-blur border border-zinc-850 p-5 rounded-2xl">
              <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    What should OmniAI remember about you?
                  </label>
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="e.g. My primary coding stack is Next.js 15, TypeScript and Tailwind"
                    className="w-full text-xs bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 outline-none focus:border-emerald-500 transition placeholder-zinc-650"
                  />
                </div>

                <div className="space-y-2 w-full sm:w-48">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl p-3 outline-none focus:border-emerald-500 text-zinc-300 transition"
                  >
                    <option value="preference">Preference</option>
                    <option value="writing_style">Writing Style</option>
                    <option value="context">Work Context</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-xs font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 w-full sm:w-auto justify-center shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add Memory
                </button>
              </form>
            </div>

            {/* Memories Listing */}
            <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-850 bg-zinc-950 text-xs font-bold text-zinc-200">
                Active Context Memory Log
              </div>

              <div className="p-5 divide-y divide-zinc-850">
                {loading && memories.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500">Loading memories...</div>
                ) : memories.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-600 flex flex-col items-center gap-2">
                    <Sparkles className="h-5 w-5 text-zinc-700" />
                    No custom memory logs found. Teach OmniAI a fact above.
                  </div>
                ) : (
                  memories.map((m) => (
                    <div key={m.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-200">{m.content}</p>
                        <span className="inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 capitalize">
                          {m.category.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-1.5 hover:bg-zinc-800 hover:text-red-400 rounded-lg text-zinc-500 transition shrink-0"
                        title="Delete memory statement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
