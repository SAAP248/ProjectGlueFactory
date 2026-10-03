import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Paperclip, Send, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MessageBubble } from '../CustomerEstimate/ConversationPanel';
import type { EstimateMessage } from '../CustomerEstimate/api';
import { subscribeToMessages, uploadEstimateFile, validateFile, formatBytes, FILE_ACCEPT } from '../CustomerEstimate/api';

const NAME_KEY = 'estimate-staff-reply-name';

interface Props {
  estimateId: string;
  onRead?: () => void;
}

export default function CustomerConversation({ estimateId, onRead }: Props) {
  const [messages, setMessages] = useState<EstimateMessage[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || 'Sales Team');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('proposal_messages')
      .select('id, sender_type, sender_name, message, reference_type, reference_label, attachment_path, attachment_name, attachment_type, attachment_size, created_at, read_at')
      .eq('estimate_id', estimateId)
      .order('created_at', { ascending: true });
    if (err || !data) { setLoadError(true); return; }
    setLoadError(false);
    setMessages(data as EstimateMessage[]);
    const unread = data.filter((m) => m.sender_type === 'customer' && !m.read_at);
    if (unread.length > 0) {
      const { error: readErr } = await supabase.from('proposal_messages').update({ read_at: new Date().toISOString() }).in('id', unread.map((m) => m.id));
      if (!readErr) onRead?.();
    }
  }, [estimateId, onRead]);

  useEffect(() => {
    setMessages(null);
    load();
    return subscribeToMessages(estimateId, load);
  }, [estimateId, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages?.length]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    const invalid = validateFile(f);
    if (invalid) { setError(invalid); return; }
    setError(null);
    setFile(f);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !file) || !name.trim()) return;
    setSending(true);
    setError(null);
    let attachment: Record<string, unknown> = {};
    if (file) {
      const up = await uploadEstimateFile(estimateId, file);
      if (up.error || !up.path) { setError(up.error); setSending(false); return; }
      attachment = { attachment_path: up.path, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size };
    }
    localStorage.setItem(NAME_KEY, name.trim());
    const { error: err } = await supabase.from('proposal_messages').insert({
      estimate_id: estimateId,
      sender_type: 'staff',
      sender_name: name.trim(),
      message: body || `Shared a file: ${file?.name}`,
      ...attachment,
    });
    setSending(false);
    if (err) { setError('Your reply could not be sent. Please try again.'); return; }
    setText('');
    setFile(null);
    load();
  };

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-500" /> Customer Conversation
        {messages && messages.length > 0 && <span className="text-xs font-normal text-gray-500">{messages.length} message{messages.length === 1 ? '' : 's'}</span>}
      </h3>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="max-h-80 overflow-y-auto bg-gray-50/60 px-4 py-4 space-y-3">
          {loadError ? (
            <p className="text-sm text-red-600 text-center py-4">Messages could not be loaded. <button onClick={load} className="underline font-medium">Try again</button></p>
          ) : messages === null ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No questions yet. When the customer asks something from their link, it shows up here.</p>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} msg={m} mine={m.sender_type === 'staff'} />)
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-gray-200 bg-white p-3 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          {file && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs text-blue-900">
              <span className="truncate flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> {file.name} <span className="text-blue-700/70">{formatBytes(file.size)}</span></span>
              <button onClick={() => setFile(null)} className="p-0.5 rounded hover:bg-blue-100" aria-label="Remove file"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder="Reply to the customer..."
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => fileRef.current?.click()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" aria-label="Attach file">
                <Paperclip className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
              <label className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                Replying as
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-28 sm:w-36 px-2 py-1 rounded border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </label>
            </div>
            <button
              onClick={send}
              disabled={sending || (!text.trim() && !file) || !name.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
