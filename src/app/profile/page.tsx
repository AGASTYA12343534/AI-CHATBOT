'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { ProtectedRoute } from '@/components/auth-guard';
import { insforge } from '@/lib/insforge';
import {
  User,
  Settings,
  Key,
  Activity,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Laptop,
  Moon,
  Sun,
  Shield,
  Clock,
  Globe
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshSession } = useAuthStore();
  const {
    preferences,
    apiKeys,
    sessions,
    fetchPreferences,
    updatePreferences,
    fetchAPIKeys,
    createAPIKey,
    deleteAPIKey,
    fetchSessions,
    loading
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<'info' | 'preferences' | 'keys' | 'sessions'>('info');

  // Profile Form States
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Preference Form States
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [preferredModel, setPreferredModel] = useState('');
  const [prefSuccess, setPrefSuccess] = useState(false);

  // API Key Form States
  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch of preferences, keys, and sessions
    fetchPreferences();
    fetchAPIKeys();
    fetchSessions();
  }, [fetchPreferences, fetchAPIKeys, fetchSessions]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.profile?.name || user.email?.split('@')[0] || '');
      setAvatarUrl(user.profile?.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      setSystemPrompt(preferences.system_prompt || '');
      setPreferredModel(preferences.preferred_model);
    }
  }, [preferences]);

  // Update profile handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    try {
      // 1. Update profiles table
      const { error: dbError } = await insforge.database
        .from('profiles')
        .update({ display_name: displayName, avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      // 2. Update auth user metadata
      const { error: authError } = await insforge.auth.setProfile({
        name: displayName,
        avatar_url: avatarUrl
      });

      if (authError) throw authError;

      await refreshSession();
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  // Update preferences handler
  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSuccess(false);
    await updatePreferences(theme, systemPrompt || null, preferredModel);
    setPrefSuccess(true);
  };

  // Create API key handler
  const handleCreateAPIKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    if (!keyName || !keyValue) {
      setKeyError('Please fill in all API Key fields.');
      return;
    }
    await createAPIKey(keyName, keyValue);
    setKeyName('');
    setKeyValue('');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-900/20 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-zinc-800/60 rounded-xl transition duration-200 text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Account Settings
              </h1>
              <p className="text-xs text-zinc-500">Configure your profile, app settings, and developer keys.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.profile?.avatar_url ? (
              <img
                src={user.profile.avatar_url}
                alt="Avatar"
                className="h-9 w-9 rounded-full ring-2 ring-emerald-500/20 object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-sm font-semibold text-emerald-400">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 text-left ${
                activeTab === 'info'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <User className="h-4.5 w-4.5" />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 text-left ${
                activeTab === 'preferences'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              App Preferences
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 text-left ${
                activeTab === 'keys'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Key className="h-4.5 w-4.5" />
              Custom API Keys
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 text-left ${
                activeTab === 'sessions'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Activity className="h-4.5 w-4.5" />
              Active Sessions
            </button>
          </div>

          {/* Panel Area */}
          <div className="md:col-span-3">
            {/* TAB 1: Profile Details */}
            {activeTab === 'info' && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Profile Details</h2>
                  <p className="text-xs text-zinc-500">Update your identity and avatar settings</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {profileSuccess && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 animate-fadeIn">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <span>Profile updated successfully.</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-6 items-center py-4 border-b border-zinc-800/60">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-20 w-20 rounded-full border border-zinc-700 object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-3xl font-semibold text-emerald-400">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-1">
                      <p className="text-sm font-semibold">Profile Photo</p>
                      <p className="text-xs text-zinc-500">Input an image URL to load your avatar</p>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-950/50 py-2.5 px-4 text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 px-4 text-zinc-200 outline-none transition focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Email Address (Read-Only)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full rounded-xl border border-zinc-850 bg-zinc-950/20 py-3 px-4 text-zinc-500 cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: App Preferences */}
            {activeTab === 'preferences' && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Application Preferences</h2>
                  <p className="text-xs text-zinc-500">Configure theme, model preferences, and custom instructions</p>
                </div>

                <form onSubmit={handleUpdatePreferences} className="space-y-6">
                  {prefSuccess && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 animate-fadeIn">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <span>Preferences saved successfully.</span>
                    </div>
                  )}

                  {/* Theme Select */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Application Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition duration-150 ${
                          theme === 'dark'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 text-zinc-400'
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition duration-150 ${
                          theme === 'light'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 text-zinc-400'
                        }`}
                      >
                        <Sun className="h-4 w-4" />
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition duration-150 ${
                          theme === 'system'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 text-zinc-400'
                        }`}
                      >
                        <Laptop className="h-4 w-4" />
                        System
                      </button>
                    </div>
                  </div>

                  {/* Preferred Model */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Default AI Model
                    </label>
                    <select
                      value={preferredModel}
                      onChange={(e) => setPreferredModel(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 px-4 text-zinc-200 outline-none transition focus:border-emerald-500"
                    >
                      <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Instruct (Free)</option>
                      <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash Exp (Free)</option>
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                    </select>
                  </div>

                  {/* System Prompt instructions */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Custom System Prompt
                    </label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="E.g. You are a senior software architect who gives concise answers and uses TypeScript format in replies."
                      rows={4}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 py-3 px-4 text-zinc-200 placeholder-zinc-750 outline-none transition focus:border-emerald-500 font-mono text-sm"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:from-emerald-500 hover:to-teal-500"
                    >
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: API Keys */}
            {activeTab === 'keys' && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Custom Developer Keys</h2>
                  <p className="text-xs text-zinc-500">Provide custom endpoint credentials or project access tokens</p>
                </div>

                {/* API Key Addition Form */}
                <form onSubmit={handleCreateAPIKey} className="bg-zinc-950/30 border border-zinc-800 p-5 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
                    <Plus className="h-4.5 w-4.5 text-emerald-500" />
                    Register New API Key
                  </h3>
                  {keyError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                      <span>{keyError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        required
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="Key Name (e.g. OpenRouter Personal)"
                        className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-950/50 py-2.5 px-4 text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-emerald-500"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        required
                        value={keyValue}
                        onChange={(e) => setKeyValue(e.target.value)}
                        placeholder="sk-or-xxxx..."
                        className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-950/50 py-2.5 pl-4 pr-10 text-zinc-200 placeholder-zinc-700 outline-none transition focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showKey ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition duration-150"
                    >
                      Create API Key
                    </button>
                  </div>
                </form>

                {/* API Keys List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-400">Registered API Keys</h3>
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs">
                      No active API keys registered. Add one above.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60">
                      {apiKeys.map((k) => (
                        <div key={k.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{k.name}</p>
                            <p className="text-xs text-zinc-500 font-mono">
                              Key: sk-...{k.key_value.substring(Math.max(0, k.key_value.length - 4))}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteAPIKey(k.id)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition duration-150"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Active Sessions */}
            {activeTab === 'sessions' && (
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Security & Sessions log</h2>
                  <p className="text-xs text-zinc-500">View active login sessions for your account</p>
                </div>

                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center text-zinc-500">
                      <Shield className="h-10 w-10 text-zinc-700" />
                      <p className="text-xs">No active sessions tracked. Main login token is active.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-950/20 gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-zinc-300 font-mono break-all">
                              {s.user_agent || 'Unknown Device'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                IP: {s.ip_address || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Login: {new Date(s.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
