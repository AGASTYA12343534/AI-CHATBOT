import { create } from 'zustand';
import { insforge } from '@/lib/insforge';

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (password: string, token: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }
      set({ user: data?.user, session: data?.accessToken || null, loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message || 'An error occurred during login', loading: false });
      return { success: false, error: err.message };
    }
  },

  register: async (email, password, displayName, avatarUrl) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name: displayName,
      });
      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }
      if (avatarUrl) {
        await insforge.auth.setProfile({
          name: displayName,
          avatar_url: avatarUrl,
        });
      }
      set({ user: data?.user, session: data?.accessToken || null, loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message || 'An error occurred during registration', loading: false });
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await insforge.auth.signOut();
      set({ user: null, session: null, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  refreshSession: async () => {
    set({ loading: true });
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error || !data) {
        set({ user: null, session: null, loading: false });
        return;
      }
      // Note: In InsForge, getCurrentUser gets user info
      set({ user: data?.user, session: data?.user ? true : null, loading: false });
    } catch (err) {
      set({ user: null, session: null, loading: false });
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const { error } = await insforge.auth.sendResetPasswordEmail({
        email,
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }
      set({ loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', loading: false });
      return { success: false, error: err.message };
    }
  },

  resetPassword: async (password, token) => {
    set({ loading: true, error: null });
    try {
      const { error } = await insforge.auth.resetPassword({
        newPassword: password,
        otp: token
      });
      if (error) {
        set({ error: error.message, loading: false });
        return { success: false, error: error.message };
      }
      set({ loading: false });
      return { success: true };
    } catch (err: any) {
      set({ error: err.message || 'An error occurred', loading: false });
      return { success: false, error: err.message };
    }
  },

  googleLogin: async () => {
    try {
      await insforge.auth.signInWithOAuth({ provider: 'google' });
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
