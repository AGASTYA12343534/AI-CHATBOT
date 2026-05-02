'use client';

import React, { useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth-guard';
import { useChatStore } from '@/store/chat-store';
import Sidebar from '@/components/sidebar';
import ChatWindow from '@/components/chat-window';

export default function DashboardPage() {
  const { fetchChats, fetchPreferences } = useChatStore();

  useEffect(() => {
    // Fetch initial chat threads and user model settings
    fetchChats();
    fetchPreferences();
  }, [fetchChats, fetchPreferences]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans antialiased">
        {/* Sidebar Left */}
        <Sidebar />

        {/* Chat Workspace Right */}
        <ChatWindow />
      </div>
    </ProtectedRoute>
  );
}
