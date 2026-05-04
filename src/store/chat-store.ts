import { create } from 'zustand';
import { insforge } from '@/lib/insforge';
import { useAuthStore } from './auth-store';

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  is_archived: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  model?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  response_time_ms?: number | null;
  search_results?: any;
  citations?: any;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  system_prompt: string | null;
  preferred_model: string;
}

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key_value: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  preferences: UserPreferences | null;
  apiKeys: APIKey[];
  sessions: UserSession[];
  loading: boolean;
  error: string | null;

  fetchChats: () => Promise<void>;
  createChat: (title?: string) => Promise<Chat | null>;
  deleteChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string, isPinned: boolean) => Promise<void>;
  archiveChat: (chatId: string, isArchived: boolean) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (
    chatId: string,
    content: string,
    sender?: 'user' | 'assistant' | 'system',
    metadata?: {
      model?: string | null;
      prompt_tokens?: number | null;
      completion_tokens?: number | null;
      response_time_ms?: number | null;
      search_results?: any;
      citations?: any;
    }
  ) => Promise<Message | null>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (theme: 'light' | 'dark' | 'system', systemPrompt: string | null, preferredModel: string) => Promise<void>;
  fetchAPIKeys: () => Promise<void>;
  createAPIKey: (name: string, keyValue: string) => Promise<void>;
  deleteAPIKey: (keyId: string) => Promise<void>;
  fetchSessions: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: [],
  preferences: null,
  apiKeys: [],
  sessions: [],
  loading: false,
  error: null,

  fetchChats: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await insforge.database
        .from('chats')
        .select()
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ chats: (data || []) as Chat[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createChat: async (title = 'New Conversation') => {
    set({ loading: true, error: null });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await insforge.database
        .from('chats')
        .insert([{ user_id: userId, title, is_pinned: false, is_archived: false }])
        .select()
        .single();

      if (error) throw error;

      const newChat = data as Chat;
      set((state) => ({
        chats: [newChat, ...state.chats],
        activeChat: newChat,
        messages: [],
        loading: false,
      }));
      return newChat;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  deleteChat: async (chatId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await insforge.database
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      set((state) => {
        const remainingChats = state.chats.filter((c) => c.id !== chatId);
        const nextActive = state.activeChat?.id === chatId ? (remainingChats[0] || null) : state.activeChat;
        return {
          chats: remainingChats,
          activeChat: nextActive,
          loading: false,
        };
      });

      const active = get().activeChat;
      if (active) {
        get().fetchMessages(active.id);
      } else {
        set({ messages: [] });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  pinChat: async (chatId, isPinned) => {
    try {
      const { error } = await insforge.database
        .from('chats')
        .update({ is_pinned: isPinned })
        .eq('id', chatId);

      if (error) throw error;
      await get().fetchChats();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  archiveChat: async (chatId, isArchived) => {
    try {
      const { error } = await insforge.database
        .from('chats')
        .update({ is_archived: isArchived })
        .eq('id', chatId);

      if (error) throw error;
      await get().fetchChats();
      
      const active = get().activeChat;
      if (active && active.id === chatId && isArchived) {
        set({ activeChat: null, messages: [] });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat });
    if (chat) {
      get().fetchMessages(chat.id);
    } else {
      set({ messages: [] });
    }
  },

  fetchMessages: async (chatId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await insforge.database
        .from('messages')
        .select()
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: (data || []) as Message[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  sendMessage: async (chatId, content, sender = 'user', metadata = {}) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');

      const payload = {
        chat_id: chatId,
        user_id: userId,
        sender,
        content,
        model: metadata.model || null,
        prompt_tokens: metadata.prompt_tokens || null,
        completion_tokens: metadata.completion_tokens || null,
        response_time_ms: metadata.response_time_ms || null,
        search_results: metadata.search_results || null,
        citations: metadata.citations || null,
      };

      const { data, error } = await insforge.database
        .from('messages')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const newMessage = data as Message;
      set((state) => ({
        messages: [...state.messages, newMessage],
      }));

      // Update the chat's updated_at timestamp so it bubbles to the top
      await insforge.database
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      return newMessage;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  editMessage: async (messageId, newContent) => {
    try {
      const { error } = await insforge.database
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);

      if (error) throw error;

      set((state) => ({
        messages: state.messages.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const { error } = await insforge.database
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchPreferences: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;

      const { data, error } = await insforge.database
        .from('user_preferences')
        .select()
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      set({ preferences: data as UserPreferences });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updatePreferences: async (theme, systemPrompt, preferredModel) => {
    set({ loading: true, error: null });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await insforge.database
        .from('user_preferences')
        .update({ theme, system_prompt: systemPrompt, preferred_model: preferredModel })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      set({ preferences: data as UserPreferences, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchAPIKeys: async () => {
    try {
      const { data, error } = await insforge.database
        .from('api_keys')
        .select()
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ apiKeys: (data || []) as APIKey[] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createAPIKey: async (name, keyValue) => {
    set({ loading: true, error: null });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await insforge.database
        .from('api_keys')
        .insert([{ user_id: userId, name, key_value: keyValue }]);

      if (error) throw error;
      get().fetchAPIKeys();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deleteAPIKey: async (keyId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await insforge.database
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;
      set((state) => ({
        apiKeys: state.apiKeys.filter((k) => k.id !== keyId),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchSessions: async () => {
    try {
      const { data, error } = await insforge.database
        .from('user_sessions')
        .select()
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ sessions: (data || []) as UserSession[] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
