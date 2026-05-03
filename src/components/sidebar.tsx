'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import {
  MessageSquare,
  Plus,
  Trash2,
  Settings,
  LogOut,
  Sparkles,
  Bot,
  User,
  GitCompare,
  Cpu,
  CreditCard,
  Brain,
  BarChart2,
  ShieldAlert
} from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    chats,
    activeChat,
    createChat,
    deleteChat,
    setActiveChat
  } = useChatStore();

  const handleNewChat = async () => {
    const newChat = await createChat();
    if (newChat) {
      router.push('/dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'User';

  return (
    <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white animate-pulse" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            OmniAI
          </span>
        </div>
        <button
          onClick={handleNewChat}
          className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition text-emerald-400"
          title="New Conversation"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Action Button */}
      <div className="px-4 pt-4">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700 py-3 text-sm font-semibold transition duration-150 text-zinc-200"
        >
          <MessageSquare className="h-4.5 w-4.5 text-emerald-500" />
          Start New Chat
        </button>
      </div>

      {/* Navigation Workspace Links */}
      <div className="px-4 pt-4 space-y-1 border-b border-zinc-900 pb-3">
        <button
          onClick={() => {
            setActiveChat(null);
            router.push('/dashboard');
          }}
          className="w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/45 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <MessageSquare className="h-4 w-4 text-emerald-500" />
          Chat Dashboard
        </button>

        <button
          onClick={() => router.push('/dashboard/compare')}
          className="w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/45 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <GitCompare className="h-4 w-4 text-emerald-500" />
          Model Comparison
        </button>

        <button
          onClick={() => router.push('/dashboard/agents')}
          className="w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/45 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <Cpu className="h-4 w-4 text-emerald-500" />
          Multi-Agent System
        </button>

        <button
          onClick={() => router.push('/dashboard/memory')}
          className="w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/45 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <Brain className="h-4 w-4 text-emerald-500" />
          Context Memory
        </button>

        <button
          onClick={() => router.push('/dashboard/analytics')}
          className="w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/45 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <BarChart2 className="h-4 w-4 text-emerald-500" />
          Usage Analytics
        </button>

        <button
          onClick={() => router.push('/dashboard/billing')}
          className="w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/45 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
        >
          <CreditCard className="h-4 w-4 text-emerald-400" />
          Billing & Quotas
        </button>

        {user?.profile?.role === 'admin' && (
          <button
            onClick={() => router.push('/dashboard/admin')}
            className="w-full flex items-center gap-2.5 rounded-lg bg-red-950/15 border border-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/20 transition"
          >
            <ShieldAlert className="h-4 w-4 text-red-400 animate-pulse" />
            Admin Console
          </button>
        )}
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-650 px-2 mb-1.5">
          History Threads
        </div>
        {chats.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-600 border border-dashed border-zinc-850 rounded-xl">
            No chats created yet.
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((c) => {
              const isActive = activeChat?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveChat(c);
                    router.push('/dashboard');
                  }}
                  className={`group relative flex items-center justify-between rounded-xl p-3 cursor-pointer transition border duration-150 ${
                    isActive
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                      : 'border-transparent text-zinc-450 hover:bg-zinc-900/40 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-8">
                    <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span className="text-sm font-medium truncate">{c.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(c.id);
                    }}
                    className="absolute right-2.5 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800/80 rounded-lg hover:text-red-400 transition duration-150 text-zinc-500"
                    title="Delete Conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Footer Panel */}
      <div className="p-4 border-t border-zinc-800 space-y-3 bg-zinc-950">
        <div className="flex items-center gap-3 px-1.5">
          {user?.profile?.avatar_url ? (
            <img
              src={user.profile.avatar_url}
              alt="Avatar"
              className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-sm font-bold text-emerald-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-200 truncate">{displayName}</p>
            <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-800/80 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400 py-2.5 text-xs font-semibold text-zinc-400 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
