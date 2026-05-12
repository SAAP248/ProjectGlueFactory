import { useCallback, useEffect, useRef, useState } from 'react';
import { Hash, Send, Plus, Lock, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  channel_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

const CURRENT_USER = 'You';

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateHeader(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function avatarColor(name: string) {
  const palette = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-slate-100 text-slate-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TeamChat() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChannels = useCallback(async () => {
    const { data } = await supabase
      .from('team_channels')
      .select('*')
      .order('created_at');
    const list = (data as Channel[]) || [];
    setChannels(list);
    if (list.length > 0 && !activeChannelId) {
      setActiveChannelId(list[0].id);
    }
  }, [activeChannelId]);

  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('team_chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at');
    setMessages((data as ChatMessage[]) || []);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (activeChannelId) loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  async function handleSend() {
    if (!input.trim() || !activeChannelId || sending) return;
    const body = input.trim();
    setInput('');
    setSending(true);
    const { data } = await supabase
      .from('team_chat_messages')
      .insert({ channel_id: activeChannelId, sender_name: CURRENT_USER, body })
      .select()
      .maybeSingle();
    if (data) setMessages(prev => [...prev, data as ChatMessage]);
    setSending(false);
  }

  async function handleCreateChannel() {
    const cleanName = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!cleanName || creating) return;
    setCreating(true);
    const { data } = await supabase
      .from('team_channels')
      .insert({ name: cleanName, description: newChannelDesc.trim(), is_private: newChannelPrivate })
      .select()
      .maybeSingle();
    setCreating(false);
    if (data) {
      setChannels(prev => [...prev, data as Channel]);
      setActiveChannelId((data as Channel).id);
      setShowNewChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelPrivate(false);
    }
  }

  function groupMessagesByDay(list: ChatMessage[]): { date: string; items: ChatMessage[] }[] {
    const groups: Record<string, ChatMessage[]> = {};
    list.forEach(m => {
      const key = new Date(m.created_at).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Channel Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Team Chat</h1>
          <p className="text-xs text-gray-500 mt-0.5">Internal messaging</p>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</span>
            <button
              onClick={() => setShowNewChannel(true)}
              title="New channel"
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <nav className="space-y-0.5 px-2">
            {channels.map(c => {
              const isActive = c.id === activeChannelId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {c.is_private ? (
                    <Lock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  )}
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
            {channels.length === 0 && (
              <p className="text-xs text-gray-400 italic px-3 py-2">No channels yet</p>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  {activeChannel.is_private ? (
                    <Lock className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Hash className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 truncate">#{activeChannel.name}</h2>
                  {activeChannel.description && (
                    <p className="text-xs text-gray-500 truncate">{activeChannel.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                <Users className="h-4 w-4" />
                Team
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 mx-auto mb-3 flex items-center justify-center">
                    <Hash className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Welcome to #{activeChannel.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeChannel.description || 'Start the conversation by sending the first message.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {groupMessagesByDay(messages).map(group => (
                    <div key={group.date} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {formatDateHeader(group.items[0].created_at)}
                        </span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      {group.items.map((m, i) => {
                        const prev = i > 0 ? group.items[i - 1] : null;
                        const compact = prev && prev.sender_name === m.sender_name &&
                          (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60000;
                        return (
                          <div key={m.id} className={`flex items-start gap-3 ${compact ? 'pl-12' : ''}`}>
                            {!compact && (
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${avatarColor(m.sender_name)}`}>
                                {initials(m.sender_name)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {!compact && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="font-bold text-sm text-gray-900">{m.sender_name}</span>
                                  <span className="text-xs text-gray-400">{formatTime(m.created_at)}</span>
                                </div>
                              )}
                              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                                {m.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={`Message #${activeChannel.name}`}
                    className="flex-1 bg-transparent resize-none outline-none text-sm py-2 max-h-32 placeholder-gray-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 px-2">Press Enter to send, Shift+Enter for a new line.</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel to start chatting.
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Create a channel</h3>
                <p className="text-xs text-gray-500 mt-0.5">Channels help organize conversations by topic.</p>
              </div>
              <button onClick={() => setShowNewChannel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Name</label>
                <div className="flex items-center border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <span className="pl-3 text-gray-400">#</span>
                  <input
                    autoFocus
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="e.g. marketing"
                    className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and dashes only.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                <input
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="What is this channel about?"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newChannelPrivate}
                  onChange={e => setNewChannelPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Make private</p>
                  <p className="text-xs text-gray-500">Only invited members will be able to see this channel.</p>
                </div>
              </label>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewChannel(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || creating}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
