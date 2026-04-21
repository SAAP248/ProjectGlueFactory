import { useState } from 'react';
import { Phone, Mail, MessageSquare, Plus, PhoneIncoming, PhoneOutgoing, MailOpen, Trash2, Check, ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CallLog, CustomerEmail, CustomerNote, Contact, SmsMessage } from './types';

interface Props {
  companyId: string;
  callLogs: CallLog[];
  emails: CustomerEmail[];
  notes: CustomerNote[];
  smsMessages: SmsMessage[];
  contacts: Contact[];
  onRefresh: () => void;
}

type SubTab = 'calls' | 'texts' | 'emails' | 'notes';

const noteTypeStyles: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600',
  billing: 'bg-blue-100 text-blue-700',
  service: 'bg-amber-100 text-amber-700',
  important: 'bg-red-100 text-red-700',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function contactName(contacts: Contact[], id: string | null) {
  if (!id) return null;
  const c = contacts.find(c => c.id === id);
  return c ? `${c.first_name} ${c.last_name}` : null;
}

export default function CommunicationsTab({ companyId, callLogs, emails, notes, smsMessages, contacts, onRefresh }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('calls');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {([
          { id: 'calls', label: 'Calls', icon: Phone, count: null },
          { id: 'texts', label: 'Texts', icon: MessageCircle, count: smsMessages.filter(s => !s.is_read && s.direction === 'inbound').length },
          { id: 'emails', label: 'Emails', icon: Mail, count: emails.filter(e => !e.is_read && e.direction === 'inbound').length },
          { id: 'notes', label: 'Notes', icon: MessageSquare, count: null },
        ] as const).map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              subTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count !== null && count > 0 && (
              <span className="text-xs font-bold rounded-full min-w-[18px] flex items-center justify-center px-1 py-0.5 bg-blue-500 text-white">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'calls' && (
        <CallsPanel
          companyId={companyId}
          callLogs={callLogs}
          contacts={contacts}
          onRefresh={onRefresh}
        />
      )}
      {subTab === 'texts' && (
        <TextsPanel
          companyId={companyId}
          smsMessages={smsMessages}
          contacts={contacts}
          onRefresh={onRefresh}
        />
      )}
      {subTab === 'emails' && (
        <EmailsPanel
          companyId={companyId}
          emails={emails}
          contacts={contacts}
          onRefresh={onRefresh}
        />
      )}
      {subTab === 'notes' && (
        <NotesPanel
          companyId={companyId}
          notes={notes}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

function CallsPanel({ companyId, callLogs, contacts, onRefresh }: {
  companyId: string;
  callLogs: CallLog[];
  contacts: Contact[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: 'inbound' as 'inbound' | 'outbound',
    contact_id: '',
    call_date: new Date().toISOString().slice(0, 16),
    duration_minutes: '',
    source: 'manual',
    caller_number: '',
    notes: '',
  });

  async function handleSave() {
    setSaving(true);
    await supabase.from('call_logs').insert({
      company_id: companyId,
      contact_id: form.contact_id || null,
      direction: form.direction,
      call_date: form.call_date,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : 0,
      source: form.source,
      caller_number: form.caller_number,
      notes: form.notes,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ direction: 'inbound', contact_id: '', call_date: new Date().toISOString().slice(0, 16), duration_minutes: '', source: 'manual', caller_number: '', notes: '' });
    onRefresh();
  }

  async function handleDelete(id: string) {
    await supabase.from('call_logs').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Call
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Log a Call</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Direction</label>
              <div className="flex gap-2">
                {(['inbound', 'outbound'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({ ...f, direction: d }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.direction === d
                        ? d === 'inbound' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {d === 'inbound' ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact (optional)</label>
              <select
                value={form.contact_id}
                onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={form.call_date}
                onChange={e => setForm(f => ({ ...f, call_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                placeholder="0"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual Entry</option>
                <option value="ringcentral">RingCentral</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={form.caller_number}
                onChange={e => setForm(f => ({ ...f, caller_number: e.target.value }))}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Call summary, topics discussed..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Call'}
            </button>
          </div>
        </div>
      )}

      {callLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No calls logged yet</p>
          <p className="text-sm text-gray-400 mt-1">Log an inbound or outbound call above</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {callLogs.map(call => {
              const name = contactName(contacts, call.contact_id);
              return (
                <div key={call.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 group">
                  <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${call.direction === 'inbound' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                    {call.direction === 'inbound'
                      ? <PhoneIncoming className="h-4 w-4 text-emerald-600" />
                      : <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${call.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {call.direction}
                      </span>
                      {name && <span className="text-sm font-medium text-gray-900">{name}</span>}
                      {call.caller_number && <span className="text-sm text-gray-500">{call.caller_number}</span>}
                      {call.source !== 'manual' && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full capitalize">{call.source}</span>
                      )}
                    </div>
                    {call.notes && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{call.notes}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>{formatDateTime(call.call_date)}</span>
                      {call.duration_minutes > 0 && <span>{call.duration_minutes} min</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(call.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TextsPanel({ companyId, smsMessages, contacts, onRefresh }: {
  companyId: string;
  smsMessages: SmsMessage[];
  contacts: Contact[];
  onRefresh: () => void;
}) {
  const [compose, setCompose] = useState('');
  const [composeContact, setComposeContact] = useState('');
  const [composePhone, setComposePhone] = useState('');
  const [composeDir, setComposeDir] = useState<'inbound' | 'outbound'>('outbound');
  const [composeSentAt, setComposeSentAt] = useState(new Date().toISOString().slice(0, 16));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSend() {
    if (!compose.trim()) return;
    setSaving(true);
    await supabase.from('sms_messages').insert({
      company_id: companyId,
      contact_id: composeContact || null,
      direction: composeDir,
      body: compose.trim(),
      phone_number: composePhone,
      sent_at: composeSentAt,
      is_read: true,
      source: 'manual',
    });
    setSaving(false);
    setCompose('');
    setComposeContact('');
    setComposePhone('');
    setComposeDir('outbound');
    setComposeSentAt(new Date().toISOString().slice(0, 16));
    setShowForm(false);
    onRefresh();
  }

  async function handleDelete(id: string) {
    await supabase.from('sms_messages').delete().eq('id', id);
    onRefresh();
  }

  async function handleMarkRead(id: string) {
    await supabase.from('sms_messages').update({ is_read: true }).eq('id', id);
    onRefresh();
  }

  const grouped: { date: string; messages: SmsMessage[] }[] = [];
  smsMessages.forEach(msg => {
    const d = new Date(msg.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: d, messages: [msg] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Text
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Log a Text Message</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Direction</label>
              <div className="flex gap-2">
                {(['inbound', 'outbound'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setComposeDir(d)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      composeDir === d
                        ? d === 'inbound' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {d === 'inbound' ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact (optional)</label>
              <select
                value={composeContact}
                onChange={e => setComposeContact(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={composePhone}
                onChange={e => setComposePhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={composeSentAt}
                onChange={e => setComposeSentAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <textarea
              value={compose}
              onChange={e => setCompose(e.target.value)}
              placeholder="Type or paste the message..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={saving || !compose.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Message'}
            </button>
          </div>
        </div>
      )}

      {smsMessages.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No text messages logged yet</p>
          <p className="text-sm text-gray-400 mt-1">Log inbound or outbound texts above</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-medium text-gray-400 px-2">{group.date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-2">
                {group.messages.map(msg => {
                  const isOut = msg.direction === 'outbound';
                  const name = contactName(contacts, msg.contact_id);
                  const time = new Date(msg.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 group ${isOut ? 'flex-row-reverse' : 'flex-row'}`}
                      onClick={() => { if (!msg.is_read) handleMarkRead(msg.id); }}
                    >
                      <div className={`max-w-[72%] space-y-1 ${isOut ? 'items-end' : 'items-start'} flex flex-col`}>
                        {name && (
                          <span className={`text-xs text-gray-400 px-1 ${isOut ? 'text-right' : 'text-left'}`}>{name}</span>
                        )}
                        <div
                          className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isOut
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : `bg-white border border-gray-200 text-gray-800 rounded-bl-sm ${!msg.is_read ? 'border-emerald-300 bg-emerald-50' : ''}`
                          }`}
                        >
                          {!msg.is_read && !isOut && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                          )}
                          {msg.body}
                        </div>
                        <div className={`flex items-center gap-2 px-1 ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-xs text-gray-400">{time}</span>
                          {msg.phone_number && (
                            <span className="text-xs text-gray-400">{msg.phone_number}</span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(msg.id); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailsPanel({ companyId, emails, contacts, onRefresh }: {
  companyId: string;
  emails: CustomerEmail[];
  contacts: Contact[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: 'inbound' as 'inbound' | 'outbound',
    contact_id: '',
    subject: '',
    body: '',
    from_address: '',
    to_address: '',
    email_date: new Date().toISOString().slice(0, 16),
  });

  async function handleSave() {
    if (!form.subject.trim()) return;
    setSaving(true);
    await supabase.from('customer_emails').insert({
      company_id: companyId,
      contact_id: form.contact_id || null,
      direction: form.direction,
      subject: form.subject,
      body: form.body,
      from_address: form.from_address,
      to_address: form.to_address,
      email_date: form.email_date,
      is_read: true,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ direction: 'inbound', contact_id: '', subject: '', body: '', from_address: '', to_address: '', email_date: new Date().toISOString().slice(0, 16) });
    onRefresh();
  }

  async function handleDelete(id: string) {
    await supabase.from('customer_emails').delete().eq('id', id);
    onRefresh();
  }

  async function handleMarkRead(id: string) {
    await supabase.from('customer_emails').update({ is_read: true }).eq('id', id);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Email
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Log an Email</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Direction</label>
              <div className="flex gap-2">
                {(['inbound', 'outbound'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({ ...f, direction: d }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.direction === d
                        ? d === 'inbound' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contact (optional)</label>
              <select
                value={form.contact_id}
                onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.email ? ` — ${c.email}` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="email"
                value={form.from_address}
                onChange={e => setForm(f => ({ ...f, from_address: e.target.value }))}
                placeholder="sender@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="email"
                value={form.to_address}
                onChange={e => setForm(f => ({ ...f, to_address: e.target.value }))}
                placeholder="recipient@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={form.email_date}
                onChange={e => setForm(f => ({ ...f, email_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Email subject..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Paste or type the email body..."
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.subject.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Email'}
            </button>
          </div>
        </div>
      )}

      {emails.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No emails logged yet</p>
          <p className="text-sm text-gray-400 mt-1">Log inbound or outbound emails above</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {emails.map(email => {
              const name = contactName(contacts, email.contact_id);
              const isOpen = expanded === email.id;
              return (
                <div key={email.id} className={`group ${!email.is_read && email.direction === 'inbound' ? 'bg-blue-50/40' : ''}`}>
                  <div
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setExpanded(isOpen ? null : email.id);
                      if (!email.is_read) handleMarkRead(email.id);
                    }}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${email.direction === 'inbound' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                      {email.is_read
                        ? <MailOpen className={`h-4 w-4 ${email.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'}`} />
                        : <Mail className={`h-4 w-4 ${email.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${email.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {email.direction}
                        </span>
                        {name && <span className="text-sm text-gray-500">{name}</span>}
                        {!email.is_read && email.direction === 'inbound' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-sm mt-0.5 truncate ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(email.email_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(email.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-6 text-xs text-gray-500 mb-3 flex-wrap">
                          {email.from_address && <span><span className="font-medium text-gray-600">From:</span> {email.from_address}</span>}
                          {email.to_address && <span><span className="font-medium text-gray-600">To:</span> {email.to_address}</span>}
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{email.body || <span className="italic text-gray-400">No body</span>}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NotesPanel({ companyId, notes, onRefresh }: {
  companyId: string;
  notes: CustomerNote[];
  onRefresh: () => void;
}) {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [isImportant, setIsImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!newNote.trim()) return;
    setSaving(true);
    await supabase.from('customer_notes').insert({
      company_id: companyId,
      note_type: noteType,
      note: newNote.trim(),
      is_important: isImportant,
    });
    setSaving(false);
    setNewNote('');
    setNoteType('general');
    setIsImportant(false);
    onRefresh();
  }

  async function handleDelete(id: string) {
    await supabase.from('customer_notes').delete().eq('id', id);
    onRefresh();
  }

  const important = notes.filter(n => n.is_important);
  const regular = notes.filter(n => !n.is_important);
  const sorted = [...important, ...regular];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Add Note</h3>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="service">Service</option>
              <option value="important">Important</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={e => setIsImportant(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Pin as important
            </label>
          </div>
          <button
            onClick={handleSave}
            disabled={!newNote.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(note => (
            <div
              key={note.id}
              className={`bg-white rounded-xl border p-5 group ${note.is_important ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${noteTypeStyles[note.note_type] || 'bg-gray-100 text-gray-600'}`}>
                      {note.note_type}
                    </span>
                    {note.is_important && (
                      <span className="px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Pinned</span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{note.note}</p>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
