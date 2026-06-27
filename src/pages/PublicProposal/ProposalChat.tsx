import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  sender_type: 'customer' | 'staff';
  sender_name: string;
  message: string;
  reference_type: string | null;
  reference_label: string | null;
  created_at: string;
}

interface Props {
  estimateId: string;
  rooms: any[];
  lineItems: any[];
  systems: any[];
  initialMessages: Message[];
  onMessageSent: () => void;
}

export default function ProposalChat({ estimateId, rooms, lineItems, systems, initialMessages, onMessageSent }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [senderName, setSenderName] = useState(() => localStorage.getItem('proposal_sender_name') || '');
  const [showNameInput, setShowNameInput] = useState(!localStorage.getItem('proposal_sender_name'));
  const [sending, setSending] = useState(false);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [selectedRef, setSelectedRef] = useState<{ type: string; id: string; label: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !senderName.trim()) return;
    setSending(true);

    localStorage.setItem('proposal_sender_name', senderName.trim());

    const { data } = await supabase.from('proposal_messages').insert({
      estimate_id: estimateId,
      sender_type: 'customer',
      sender_name: senderName.trim(),
      message: text.trim(),
      reference_type: selectedRef?.type || null,
      reference_id: selectedRef?.id || null,
      reference_label: selectedRef?.label || null,
    }).select().single();

    if (data) {
      setMessages(prev => [...prev, data as Message]);
    }
    setText('');
    setSelectedRef(null);
    setSending(false);
    onMessageSent();
  }

  function handleNameSubmit() {
    if (senderName.trim()) {
      localStorage.setItem('proposal_sender_name', senderName.trim());
      setShowNameInput(false);
    }
  }

  const referenceOptions = [
    ...lineItems.map((li: any) => ({ type: 'product', id: li.id, label: li.description })),
    ...rooms.map((r: any) => ({ type: 'room', id: r.id, label: r.name })),
    ...systems.map((s: any) => ({ type: 'system', id: s.id, label: s.name })),
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-gray-900">Questions & Discussion</h3>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Messages */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-3 min-h-[120px]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No messages yet. Ask a question about this proposal!</p>
          </div>
        )}

        {messages.map(msg => {
          const isCustomer = msg.sender_type === 'customer';
          return (
            <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isCustomer ? 'order-1' : 'order-0'}`}>
                {msg.reference_label && (
                  <div className={`flex items-center gap-1 mb-1 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                    <Tag className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">Re: {msg.reference_label}</span>
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl ${
                  isCustomer
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                </div>
                <div className={`flex items-center gap-2 mt-1 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-400">{msg.sender_name}</span>
                  <span className="text-xs text-gray-300">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Name input (first time only) */}
      {showNameInput && (
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <p className="text-sm font-medium text-blue-900 mb-2">Before sending, what's your name?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Your name"
              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleNameSubmit}
              disabled={!senderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Compose */}
      {!showNameInput && (
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          {/* Reference tag */}
          {selectedRef && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                <Tag className="h-3 w-3" />
                Re: {selectedRef.label}
                <button onClick={() => setSelectedRef(null)} className="ml-1 text-blue-400 hover:text-blue-600">&times;</button>
              </span>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask a question..."
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              {referenceOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRefPicker(!showRefPicker)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Reference a product or room"
                >
                  <Tag className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Reference picker dropdown */}
          {showRefPicker && (
            <div className="border border-gray-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto">
              {referenceOptions.map(opt => (
                <button
                  key={`${opt.type}-${opt.id}`}
                  onClick={() => { setSelectedRef(opt); setShowRefPicker(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
                >
                  <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                    opt.type === 'product' ? 'bg-emerald-100 text-emerald-700' :
                    opt.type === 'room' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {opt.type === 'product' ? 'Item' : opt.type === 'room' ? 'Room' : 'System'}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
