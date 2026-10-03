import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Paperclip, Send, X, FileText, Image as ImageIcon, Loader2, Tag, Download } from 'lucide-react';
import type { EstimateMessage, CustomerLineItem } from './api';
import { formatBytes, getFileUrl, FILE_ACCEPT, validateFile } from './api';

export const CONVERSATION_ANCHOR = 'estimate-conversation';

export function MessageBubble({ msg, mine }: { msg: EstimateMessage; mine: boolean }) {
  const [opening, setOpening] = useState(false);
  const isImage = msg.attachment_type?.startsWith('image/');

  const openFile = async () => {
    if (!msg.attachment_path) return;
    setOpening(true);
    const url = await getFileUrl(msg.attachment_path);
    setOpening(false);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[85%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-semibold text-slate-700">{msg.sender_name}</span>
          {msg.sender_type === 'staff' && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Sales Team</span>
          )}
          <span className="text-[11px] text-slate-400">
            {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'}`}>
          {msg.reference_label && (
            <p className={`flex items-center gap-1 text-xs mb-1.5 ${mine ? 'text-blue-100' : 'text-slate-500'}`}>
              <Tag className="w-3 h-3" /> About: {msg.reference_label}
            </p>
          )}
          {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
          {msg.attachment_path && (
            <button
              type="button"
              onClick={openFile}
              className={`mt-2 flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 transition-colors ${mine ? 'bg-blue-500/60 hover:bg-blue-500' : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}
            >
              {isImage ? <ImageIcon className="w-4 h-4 flex-shrink-0" /> : <FileText className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate flex-1 text-xs font-medium">{msg.attachment_name || 'Attachment'}</span>
              <span className={`text-[11px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{formatBytes(msg.attachment_size)}</span>
              {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  messages: EstimateMessage[] | null;
  lineItems: CustomerLineItem[];
  defaultName: string;
  onSend: (input: { name: string; message: string; file: File | null; referenceItem: CustomerLineItem | null }) => Promise<string | null>;
}

export default function ConversationSection({ messages, lineItems, defaultName, onSend }: Props) {
  const [name, setName] = useState(defaultName);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [refId, setRefId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!name && defaultName) setName(defaultName); }, [defaultName, name]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    const invalid = validateFile(f);
    if (invalid) { setError(invalid); return; }
    setError(null);
    setFile(f);
  };

  const send = async () => {
    if (!name.trim()) { setError('Please enter your name so our team knows who is asking.'); return; }
    if (!text.trim() && !file) return;
    setSending(true);
    setError(null);
    const err = await onSend({
      name: name.trim(),
      message: text.trim(),
      file,
      referenceItem: lineItems.find((li) => li.id === refId) || null,
    });
    setSending(false);
    if (err) { setError(err); return; }
    setText('');
    setFile(null);
    setRefId('');
  };

  const newestFirst = messages ? [...messages].sort((a, b) => b.created_at.localeCompare(a.created_at)) : null;

  return (
    <section id={CONVERSATION_ANCHOR} className="scroll-mt-24 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
      <header className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Questions & Files</h2>
          <p className="text-xs text-slate-500">Ask our sales team anything or share documents. Replies appear here.</p>
        </div>
        {messages && messages.length > 0 && (
          <span className="text-xs text-slate-500">{messages.length} message{messages.length === 1 ? '' : 's'}</span>
        )}
      </header>

      <div className="p-4 sm:p-5 space-y-3 bg-slate-50/60 border-b border-slate-200">
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={120}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Question is about"
          >
            <option value="">General question</option>
            {lineItems.map((li) => (
              <option key={li.id} value={li.id}>{(li.description || 'Item').slice(0, 60)}</option>
            ))}
          </select>
        </div>
        {file && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate flex-1">{file.name}</span>
            <span className="text-blue-700">{formatBytes(file.size)}</span>
            <button onClick={() => setFile(null)} className="p-0.5 rounded hover:bg-blue-100" aria-label="Remove file"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            aria-label="Attach a file"
            title="Attach a file (max 10 MB)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            maxLength={4000}
            placeholder="Type your question..."
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={sending || (!text.trim() && !file)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-4 max-h-[560px] overflow-y-auto">
        {newestFirst === null ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading conversation...</div>
        ) : newestFirst.length === 0 ? (
          <div className="text-center py-10 px-6">
            <p className="text-sm font-medium text-slate-800">Have a question?</p>
            <p className="text-sm text-slate-500 mt-1">Ask about any item, or share photos, floor plans and documents with our team.</p>
          </div>
        ) : (
          newestFirst.map((m) => <MessageBubble key={m.id} msg={m} mine={m.sender_type === 'customer'} />)
        )}
      </div>
    </section>
  );
}
