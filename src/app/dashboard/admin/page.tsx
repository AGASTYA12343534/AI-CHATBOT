'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth-guard';
import Sidebar from '@/components/sidebar';
import { insforge } from '@/lib/insforge';
import { useAuthStore } from '@/store/auth-store';
import {
  ShieldAlert,
  Users,
  Activity,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowLeft,
  Loader2
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [loading, setLoading] = useState(true);

  const checkRoleAndLoad = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUsersList(data.users || []);
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRoleAndLoad();
  }, [user]);

  const handleAction = async (targetUserId: string, action: 'suspend' | 'ban', currentValue: boolean) => {
    setLoading(true);
    try {
      const token = (insforge.auth as any).getAccessToken();
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: targetUserId,
          action,
          value: !currentValue,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Admin action failed');

      // Refresh list
      checkRoleAndLoad();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  if (loading && isAdmin === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 p-6 text-center space-y-4">
        <ShieldAlert className="h-14 w-14 text-red-500" />
        <h2 className="text-xl font-bold text-zinc-100">Access Denied</h2>
        <p className="text-xs text-zinc-550 max-w-xs">You do not have administration privileges to view this console.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-zinc-900 border border-zinc-800 text-xs px-4 py-2 rounded-lg hover:text-white transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

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
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  OmniAI Admin Panel
                </h1>
                <p className="text-[10px] text-zinc-500">Configure global configurations, manage roles, and review audit records</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
            {/* Tabs selector */}
            <div className="flex gap-4 border-b border-zinc-850">
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'users' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Users className="h-4 w-4" />
                User Profiles ({usersList.length})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`pb-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'logs' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Activity className="h-4 w-4" />
                Audit Logs ({auditLogs.length})
              </button>
            </div>

            {/* Content cards */}
            {activeTab === 'users' ? (
              <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-850">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Active Plan</th>
                        <th className="p-4 text-center">Status Indicators</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/80 text-zinc-300">
                      {usersList.map((u) => (
                        <tr key={u.user_id} className="hover:bg-zinc-900/10">
                          <td className="p-4 font-semibold text-zinc-200">{u.display_name || 'Guest'}</td>
                          <td className="p-4 text-zinc-450">{u.email}</td>
                          <td className="p-4 capitalize">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
                            }`}>{u.role}</span>
                          </td>
                          <td className="p-4 capitalize">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.plan === 'pro' ? 'bg-emerald-500/10 text-emerald-400' : u.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-zinc-500'
                            }`}>{u.plan}</span>
                          </td>
                          <td className="p-4 text-center space-x-2">
                            {u.is_suspended && (
                              <span className="bg-amber-500/15 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold">Suspended</span>
                            )}
                            {u.is_banned && (
                              <span className="bg-red-500/15 border border-red-500/20 text-red-400 px-2 py-0.5 rounded text-[9px] font-bold">Banned</span>
                            )}
                            {!u.is_suspended && !u.is_banned && (
                              <span className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold">Active</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {/* Suspend button */}
                            <button
                              onClick={() => handleAction(u.user_id, 'suspend', u.is_suspended)}
                              className={`p-1.5 rounded-lg border transition ${
                                u.is_suspended
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                  : 'border-zinc-800 bg-zinc-950 text-zinc-450 hover:text-white'
                              }`}
                              title={u.is_suspended ? 'Unsuspend user' : 'Suspend user'}
                            >
                              {u.is_suspended ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </button>

                            {/* Ban button */}
                            <button
                              onClick={() => handleAction(u.user_id, 'ban', u.is_banned)}
                              className={`p-1.5 rounded-lg border transition ${
                                u.is_banned
                                  ? 'border-zinc-800 bg-zinc-950 text-red-400'
                                  : 'border-zinc-800 bg-zinc-950 text-zinc-450 hover:text-red-400'
                              }`}
                              title={u.is_banned ? 'Unban user' : 'Ban user'}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/35 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <div className="divide-y divide-zinc-850">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-10">No recent system events logged.</p>
                  ) : (
                    auditLogs.map((l) => (
                      <div key={l.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-zinc-300 capitalize">{l.action.replace('_', ' ')}</p>
                          <p className="text-[10px] text-zinc-550 font-mono">{JSON.stringify(l.details)}</p>
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {new Date(l.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
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
