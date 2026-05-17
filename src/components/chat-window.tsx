'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore, Message } from '@/store/chat-store';
import { insforge } from '@/lib/insforge';
import { SUPPORTED_MODELS } from '@/lib/ai/ai-factory';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Edit2,
  Check,
  Code,
  Lightbulb,
  FileText,
  Globe,
  Paperclip,
  Trash2,
  Copy,
  RotateCw,
  X,
  FileCheck
} from 'lucide-react';

export default function ChatWindow() {
  const { user } = useAuthStore();
  const {
    activeChat,
    messages,
    preferences,
    sendMessage,
    createChat,
    fetchChats,
    editMessage,
    deleteMessage
  } = useChatStore();

  const [input, setInput] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  // RAG and Search toggles
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileIndicator, setUploadedFileIndicator] = useState<string | null>(null);

  // Message Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeChat) {
      setChatTitle(activeChat.title);
    }
    setStreamingMessage('');
    setIsStreaming(false);
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, isStreaming]);

  // Rename thread handler
  const handleRenameTitle = async () => {
    if (!activeChat || !chatTitle.trim() || chatTitle === activeChat.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await insforge.database
        .from('chats')
        .update({ title: chatTitle.trim() })
        .eq('id', activeChat.id);

      setEditingTitle(false);
      await fetchChats();
    } catch (err) {
      setEditingTitle(false);
    }
  };

  // Document RAG Upload helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    setUploadingFile(true);
    setUploadedFileIndicator(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', activeChat.id);

      const token = (insforge.auth as any).getAccessToken();

      const response = await fetch('/api/document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      setUploadedFileIndicator(file.name);
      setRagEnabled(true);
    } catch (err: any) {
      alert(`Upload Error: ${err.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Streaming Core API caller
  const handleChatCompletionStream = async (chatId: string, messagesPayload: any[], userPrompt: string) => {
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const token = (insforge.auth as any).getAccessToken();
      const activeModel = preferences?.preferred_model || 'google/gemini-2.0-flash-exp:free';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId,
          messages: messagesPayload,
          model: activeModel,
          webSearchEnabled,
          ragEnabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to establish completions stream.');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulated += chunk;
        setStreamingMessage(accumulated);
      }

      // Refresh messages store after successful DB write
      useChatStore.getState().fetchMessages(chatId);
    } catch (err: any) {
      alert(`Chat Error: ${err.message}`);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  // Form submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !activeChat || isStreaming) return;

    const userMessageContent = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // 1. Save user message locally & in DB
    const userMessage = await sendMessage(activeChat.id, userMessageContent, 'user');
    if (!userMessage) return;

    // 2. Prepare payload of previous + current message
    const formattedMessages = messages.map((m) => ({
      role: m.sender,
      content: m.content,
    }));
    formattedMessages.push({ role: 'user', content: userMessageContent });

    // 3. Request Streaming
    await handleChatCompletionStream(activeChat.id, formattedMessages, userMessageContent);
  };

  // Trigger quick prompt
  const handleQuickPrompt = async (prompt: string) => {
    const newChat = await createChat(prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt);
    if (newChat) {
      const userMsg = await sendMessage(newChat.id, prompt, 'user');
      if (userMsg) {
        await handleChatCompletionStream(newChat.id, [{ role: 'user', content: prompt }], prompt);
      }
    }
  };

  // Regenerate Assistant response
  const handleRegenerate = async () => {
    if (!activeChat || isStreaming) return;

    // Find last user message context
    const userMessageIndex = [...messages].reverse().findIndex((m) => m.sender === 'user');
    if (userMessageIndex === -1) return;

    const actualIndex = messages.length - 1 - userMessageIndex;
    const historyPayload = messages.slice(0, actualIndex + 1).map((m) => ({
      role: m.sender,
      content: m.content,
    }));

    await handleChatCompletionStream(activeChat.id, historyPayload, messages[actualIndex].content);
  };

  // Edit Message handler
  const handleSaveMessageEdit = async (messageId: string) => {
    if (!editingMessageText.trim()) return;
    await editMessage(messageId, editingMessageText);
    setEditingMessageId(null);
    setEditingMessageText('');
    handleRegenerate();
  };

  // Markdown Custom Parser helper
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : 'code';
        const code = match ? match[2] : part.slice(3, -3);
        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs">
            <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 text-zinc-400">
              <span className="uppercase font-bold tracking-wider text-[10px] text-zinc-500">{language || 'code'}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  alert('Code copied to clipboard!');
                }}
                className="text-[10px] flex items-center gap-1 hover:text-white transition"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-4 text-emerald-400 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      const subParts = part.split(/(\*\*.*?\*\*|\*.*\*)/g);
      return (
        <p key={index} className="whitespace-pre-wrap mb-2 leading-relaxed text-zinc-200">
          {subParts.map((sp, idx) => {
            if (sp.startsWith('**') && sp.endsWith('**')) {
              return <strong key={idx} className="font-bold text-zinc-100">{sp.slice(2, -2)}</strong>;
            }
            if (sp.startsWith('*') && sp.endsWith('*')) {
              return <em key={idx} className="italic text-zinc-300">{sp.slice(1, -1)}</em>;
            }
            return sp;
          })}
        </p>
      );
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'User';
  const selectedModel = preferences?.preferred_model || 'google/gemini-2.0-flash-exp:free';

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/10 p-6 text-center select-none relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-xl space-y-8 relative">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/5 hover:scale-105 transition duration-200">
              <Bot className="h-9 w-9 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-100">
              How can I help you today?
            </h2>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">
              Welcome back, {displayName}. Choose a prompt template below or start a new thread to get answers from multiple AI engines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <button
              onClick={() => handleQuickPrompt('Draft an introductory email to a client explaining our new AI service.')}
              className="flex flex-col items-center text-left p-4 rounded-xl border border-zinc-850 bg-zinc-950/20 hover:bg-zinc-900/40 hover:border-zinc-800 transition duration-150 gap-2 group"
            >
              <FileText className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition" />
              <div className="text-xs font-semibold text-zinc-300 text-center w-full">Draft Email</div>
              <div className="text-[10px] text-zinc-600 text-center line-clamp-2">Client introduction templates</div>
            </button>

            <button
              onClick={() => handleQuickPrompt('Brainstorm 5 innovative startup ideas in the renewable energy space.')}
              className="flex flex-col items-center text-left p-4 rounded-xl border border-zinc-850 bg-zinc-950/20 hover:bg-zinc-900/40 hover:border-zinc-800 transition duration-150 gap-2 group"
            >
              <Lightbulb className="h-5 w-5 text-teal-500 group-hover:scale-110 transition" />
              <div className="text-xs font-semibold text-zinc-300 text-center w-full">Brainstorm Ideas</div>
              <div className="text-[10px] text-zinc-600 text-center line-clamp-2">Renewable energy startups</div>
            </button>

            <button
              onClick={() => handleQuickPrompt('Write a typescript function to deep clone an object recursively.')}
              className="flex flex-col items-center text-left p-4 rounded-xl border border-zinc-850 bg-zinc-950/20 hover:bg-zinc-900/40 hover:border-zinc-800 transition duration-150 gap-2 group"
            >
              <Code className="h-5 w-5 text-blue-500 group-hover:scale-110 transition" />
              <div className="text-xs font-semibold text-zinc-300 text-center w-full">Solve Code</div>
              <div className="text-[10px] text-zinc-600 text-center line-clamp-2">Recursive deep clone helper</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-900/5 h-full relative">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                onBlur={handleRenameTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameTitle()}
                className="bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2.5 py-1 text-sm outline-none focus:border-emerald-500"
                autoFocus
              />
              <button onClick={handleRenameTitle} className="p-1 hover:text-emerald-400 text-zinc-400">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group min-w-0">
              <h2 className="text-sm font-bold text-zinc-200 truncate">{activeChat.title}</h2>
              <button
                onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-200 transition duration-150 shrink-0"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/10 bg-emerald-500/5 text-[10px] font-bold text-emerald-400 tracking-wide uppercase select-none">
            <Zap className="h-3 w-3 fill-emerald-400" />
            {selectedModel.includes('/') ? selectedModel.split('/')[1].split(':')[0] : selectedModel}
          </div>
        </div>
      </header>

      {/* Message rendering space */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-650 text-xs gap-2">
            <Sparkles className="h-5 w-5 text-zinc-700" />
            Send a message to begin the conversation
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div key={m.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} group/bubble`}>
                  {/* Left Avatar (Assistant) */}
                  {!isUser && (
                    <div className="h-8.5 w-8.5 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed relative ${
                      isUser
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-medium shadow-md shadow-emerald-950/20'
                        : 'bg-zinc-900/50 border border-zinc-800/80 text-zinc-200'
                    }`}
                  >
                    {editingMessageId === m.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className="w-full text-zinc-100 bg-zinc-950/80 border border-zinc-700 rounded-lg p-2.5 text-sm outline-none"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveMessageEdit(m.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-md font-semibold"
                          >
                            Save & Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {renderMessageContent(m.content)}

                        {/* Timing / Model details if present */}
                        {!isUser && m.response_time_ms && (
                          <div className="text-[10px] text-zinc-550 mt-3 pt-2 border-t border-zinc-850 flex items-center gap-2">
                            <span>Time: {(m.response_time_ms / 1000).toFixed(2)}s</span>
                            {m.model && <span className="opacity-60">| Model: {m.model.split('/').pop()}</span>}
                          </div>
                        )}
                      </>
                    )}

                    {/* Actions Menu */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover/bubble:opacity-100 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 transition">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          alert('Message copied to clipboard.');
                        }}
                        title="Copy text"
                        className="p-1 hover:text-white text-zinc-550 rounded hover:bg-zinc-800"
                      >
                        <Copy className="h-3 w-3" />
                      </button>

                      {isUser && (
                        <button
                          onClick={() => {
                            setEditingMessageId(m.id);
                            setEditingMessageText(m.content);
                          }}
                          title="Edit message"
                          className="p-1 hover:text-white text-zinc-550 rounded hover:bg-zinc-800"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}

                      <button
                        onClick={() => deleteMessage(m.id)}
                        title="Delete message"
                        className="p-1 hover:text-red-400 text-zinc-550 rounded hover:bg-zinc-800"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Right Avatar (User) */}
                  {isUser && (
                    <div className="h-8.5 w-8.5 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0 select-none">
                      {user?.profile?.avatar_url ? (
                        <img src={user.profile.avatar_url} alt="User avatar" className="h-full w-full rounded-lg object-cover" />
                      ) : (
                        <User className="h-4.5 w-4.5 text-zinc-300" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Streaming message chunk indicator */}
            {isStreaming && streamingMessage && (
              <div className="flex gap-4 justify-start">
                <div className="h-8.5 w-8.5 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shrink-0">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 text-sm text-zinc-200 max-w-[75%]">
                  {renderMessageContent(streamingMessage)}
                </div>
              </div>
            )}

            {/* Simulating Loading dots */}
            {isStreaming && !streamingMessage && (
              <div className="flex gap-4 justify-start">
                <div className="h-8.5 w-8.5 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shrink-0">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 text-sm text-zinc-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input panel footer */}
      <footer className="p-4 bg-zinc-950 border-t border-zinc-800/85">
        <div className="max-w-3xl mx-auto mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-zinc-400 text-xs">
          <div className="flex items-center gap-3">
            {/* Search toggle */}
            <button
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
                webSearchEnabled
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Search Web</span>
            </button>

            {/* RAG trigger */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
                uploadingFile || uploadedFileIndicator
                  ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              {uploadingFile ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
              ) : uploadedFileIndicator ? (
                <FileCheck className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              <span>{uploadingFile ? 'Uploading...' : uploadedFileIndicator ? 'Document Loaded' : 'Add Document'}</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.md,.pdf"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Show regenerate when messages are present */}
            {messages.length > 0 && !isStreaming && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 px-2 py-1 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-750 bg-zinc-900 rounded-lg"
              >
                <RotateCw className="h-3 w-3" />
                Regenerate
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-end bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 shadow-lg focus-within:border-emerald-500/70 transition duration-150">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadingFile
                ? 'Processing document embeddings...'
                : 'Type a message or press Shift+Enter for new line...'
            }
            disabled={uploadingFile}
            className="flex-1 max-h-36 min-h-[24px] bg-transparent text-zinc-200 text-sm outline-none resize-none placeholder-zinc-600 py-1.5 scrollbar-none pr-12 leading-relaxed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || uploadingFile}
            className="absolute right-3 bottom-3 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:hover:bg-emerald-600 disabled:scale-100 transition hover:scale-105 active:scale-95 shadow-md shadow-emerald-950/20"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        <p className="text-[10px] text-zinc-650 text-center mt-2.5 select-none">
          OmniAI Multi-Model Engine. Web Search & Vector RAG operations are live.
        </p>
      </footer>
    </div>
  );
}
