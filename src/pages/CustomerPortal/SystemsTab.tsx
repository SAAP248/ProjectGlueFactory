import { useState } from 'react';
import { Shield, Flame, Camera, Key, Phone, Plus, CreditCard as Edit2, Trash2, CheckCircle, FlaskConical, X, Lock, Eye, EyeOff, Save, AlertTriangle } from 'lucide-react';
import type { PortalSystem, EmergencyContact, SystemPasscode, TestMode, PortalUser } from './types';
import { supabase } from '../../lib/supabase';

interface Props {
  systems: PortalSystem[];
  user: PortalUser;
  emergencyContacts: EmergencyContact[];
  passcodes: SystemPasscode[];
  testModes: TestMode[];
  loading: boolean;
  onRefresh: () => void;
}

function systemIcon(iconName: string | undefined) {
  if (iconName === 'flame' || iconName?.includes('fire')) return <Flame className="h-5 w-5" />;
  if (iconName === 'camera' || iconName?.includes('camera')) return <Camera className="h-5 w-5" />;
  if (iconName === 'key' || iconName?.includes('access')) return <Key className="h-5 w-5" />;
  return <Shield className="h-5 w-5" />;
}

const ALARM_TYPES = ['burglar alarm', 'fire alarm', 'intrusion', 'security'];
function isAlarmOrFire(sys: PortalSystem) {
  const typeName = sys.system_types?.name?.toLowerCase() || '';
  return ALARM_TYPES.some(t => typeName.includes(t));
}

export default function SystemsTab({ systems, user, emergencyContacts, passcodes, testModes, loading, onRefresh }: Props) {
  const [selectedSystem, setSelectedSystem] = useState<PortalSystem | null>(systems[0] || null);
  const [activeSection, setActiveSection] = useState<'overview' | 'contacts' | 'passcodes' | 'test'>('overview');
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [newContact, setNewContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', relationship: '', phone: '', phone_alt: '', has_key: false, notes: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [editingPasscodes, setEditingPasscodes] = useState(false);
  const [passcodeValues, setPasscodeValues] = useState<Record<string, string>>({});
  const [showPasscodes, setShowPasscodes] = useState(false);
  const [testReason, setTestReason] = useState('');
  const [placingTest, setPlacingTest] = useState(false);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent" /></div>;
  if (!systems.length) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-semibold">No systems on file</p>
      </div>
    </div>
  );

  const sys = selectedSystem || systems[0];
  const sysContacts = emergencyContacts.filter(c => c.system_id === sys.id).sort((a, b) => a.priority_order - b.priority_order);
  const sysPasscodes = passcodes.filter(p => p.system_id === sys.id);
  const sysTest = testModes.find(t => t.system_id === sys.id);
  const isOnTest = sysTest?.is_on_test === true;
  const showAlarmFeatures = isAlarmOrFire(sys);

  async function saveContact() {
    if (!contactForm.name || !contactForm.phone) return;
    setSavingContact(true);
    if (editingContact) {
      await supabase.from('portal_emergency_contacts').update({
        ...contactForm, updated_at: new Date().toISOString()
      }).eq('id', editingContact.id);
    } else {
      await supabase.from('portal_emergency_contacts').insert({
        system_id: sys.id,
        company_id: user.company_id,
        priority_order: sysContacts.length + 1,
        ...contactForm,
      });
    }
    setSavingContact(false);
    setEditingContact(null);
    setNewContact(false);
    setContactForm({ name: '', relationship: '', phone: '', phone_alt: '', has_key: false, notes: '' });
    onRefresh();
  }

  async function deleteContact(id: string) {
    await supabase.from('portal_emergency_contacts').delete().eq('id', id);
    onRefresh();
  }

  async function savePasscodes() {
    for (const [codeType, passcode] of Object.entries(passcodeValues)) {
      const existing = sysPasscodes.find(p => p.code_type === codeType);
      if (existing) {
        await supabase.from('portal_system_passcodes').update({ passcode, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else if (passcode) {
        await supabase.from('portal_system_passcodes').insert({ system_id: sys.id, company_id: user.company_id, code_type: codeType, passcode });
      }
    }
    setEditingPasscodes(false);
    setPasscodeValues({});
    onRefresh();
  }

  async function toggleTestMode() {
    setPlacingTest(true);
    if (isOnTest) {
      if (sysTest) {
        await supabase.from('portal_test_mode').update({
          is_on_test: false,
          test_end_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', sysTest.id);
      }
    } else {
      if (sysTest) {
        await supabase.from('portal_test_mode').update({
          is_on_test: true,
          test_start_at: new Date().toISOString(),
          test_end_at: null,
          reason: testReason,
          placed_by: `${user.first_name} ${user.last_name}`,
          updated_at: new Date().toISOString(),
        }).eq('id', sysTest.id);
      } else {
        await supabase.from('portal_test_mode').insert({
          system_id: sys.id,
          company_id: user.company_id,
          is_on_test: true,
          test_start_at: new Date().toISOString(),
          reason: testReason,
          placed_by: `${user.first_name} ${user.last_name}`,
        });
      }
    }
    setTestReason('');
    setPlacingTest(false);
    onRefresh();
  }

  function startEditContact(c: EmergencyContact) {
    setContactForm({ name: c.name, relationship: c.relationship, phone: c.phone, phone_alt: c.phone_alt || '', has_key: c.has_key, notes: c.notes || '' });
    setEditingContact(c);
    setNewContact(false);
  }

  function startNewContact() {
    setContactForm({ name: '', relationship: '', phone: '', phone_alt: '', has_key: false, notes: '' });
    setEditingContact(null);
    setNewContact(true);
  }

  function cancelContactEdit() {
    setEditingContact(null);
    setNewContact(false);
    setContactForm({ name: '', relationship: '', phone: '', phone_alt: '', has_key: false, notes: '' });
  }

  function startEditPasscodes() {
    const vals: Record<string, string> = {};
    ['verbal', 'duress', 'cancel'].forEach(t => {
      vals[t] = sysPasscodes.find(p => p.code_type === t)?.passcode || '';
    });
    setPasscodeValues(vals);
    setEditingPasscodes(true);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Systems</h2>

      {/* System Selector */}
      {systems.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {systems.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedSystem(s); setActiveSection('overview'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                selectedSystem?.id === s.id ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {systemIcon(s.system_types?.icon_name)}
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* System Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
            {systemIcon(sys.system_types?.icon_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{sys.name}</h3>
                <p className="text-sm text-gray-500">{sys.system_types?.name} {sys.sites ? `• ${sys.sites.name}` : ''}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sys.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {sys.status}
                </span>
                {isOnTest && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <FlaskConical className="h-3 w-3" />
                    On Test
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {sys.panel_make && <div><span className="text-gray-500">Panel:</span> <span className="font-medium text-gray-800">{sys.panel_make} {sys.panel_model}</span></div>}
              {sys.monitoring_account_number && <div><span className="text-gray-500">Account #:</span> <span className="font-medium text-gray-800">{sys.monitoring_account_number}</span></div>}
              {sys.installation_date && <div><span className="text-gray-500">Installed:</span> <span className="font-medium text-gray-800">{new Date(sys.installation_date).toLocaleDateString()}</span></div>}
              {sys.sites?.address && <div><span className="text-gray-500">Location:</span> <span className="font-medium text-gray-800">{sys.sites.address}</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['overview', ...(showAlarmFeatures ? ['contacts', 'passcodes', 'test'] : [])] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
              activeSection === s ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {s === 'contacts' ? 'Emergency Contacts' : s === 'passcodes' ? 'Passcodes' : s === 'test' ? 'Test Mode' : 'Overview'}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {sys.notes ? <p className="text-sm text-gray-700">{sys.notes}</p> : <p className="text-sm text-gray-400 italic">No additional information.</p>}
          {!showAlarmFeatures && (
            <p className="text-sm text-gray-500 mt-4">This system type does not have alarm-specific features (emergency contacts, passcodes, test mode). These are available for burglar alarm and fire alarm systems.</p>
          )}
        </div>
      )}

      {/* Emergency Contacts */}
      {activeSection === 'contacts' && showAlarmFeatures && (
        <div className="space-y-3">
          {sysContacts.map((c, idx) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              {editingContact?.id === c.id ? (
                <ContactForm form={contactForm} setForm={setContactForm} onSave={saveContact} onCancel={cancelContactEdit} saving={savingContact} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{c.name}</p>
                        {c.has_key && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Key className="h-3 w-3" />Has Key</span>}
                      </div>
                      <p className="text-sm text-gray-500">{c.relationship}</p>
                      <p className="text-sm text-gray-700 mt-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{c.phone}</p>
                      {c.phone_alt && <p className="text-sm text-gray-500">{c.phone_alt} (alt)</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditContact(c)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteContact(c.id)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {newContact ? (
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3">New Emergency Contact</h4>
              <ContactForm form={contactForm} setForm={setContactForm} onSave={saveContact} onCancel={cancelContactEdit} saving={savingContact} />
            </div>
          ) : (
            <button
              onClick={startNewContact}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Emergency Contact
            </button>
          )}
        </div>
      )}

      {/* Passcodes */}
      {activeSection === 'passcodes' && showAlarmFeatures && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">System Passcodes</h3>
              <p className="text-xs text-gray-500 mt-0.5">Codes used when verifying identity with the monitoring center.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPasscodes(v => !v)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1.5 transition-colors">
                {showPasscodes ? <><EyeOff className="h-3.5 w-3.5" />Hide</> : <><Eye className="h-3.5 w-3.5" />Show</>}
              </button>
              {!editingPasscodes && (
                <button onClick={startEditPasscodes} className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />Edit
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { type: 'verbal', label: 'Verbal Code', desc: 'Given to monitoring center to cancel alarm' },
              { type: 'duress', label: 'Duress Code', desc: 'Silent panic — notifies authorities without alerting intruder' },
              { type: 'cancel', label: 'Cancel Code', desc: 'Cancels dispatch request' },
            ].map(({ type, label, desc }) => {
              const existing = sysPasscodes.find(p => p.code_type === type);
              return (
                <div key={type} className="flex items-center justify-between gap-4 bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  {editingPasscodes ? (
                    <input
                      type="text"
                      value={passcodeValues[type] || ''}
                      onChange={e => setPasscodeValues(v => ({ ...v, [type]: e.target.value }))}
                      placeholder="Enter code"
                      className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="font-mono font-bold text-gray-900 text-base w-32 text-right">
                      {existing ? (showPasscodes ? existing.passcode : '••••••') : <span className="text-gray-400 text-sm font-normal italic">not set</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {editingPasscodes && (
            <div className="flex gap-3">
              <button onClick={savePasscodes} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
                <Save className="h-4 w-4" />Save Passcodes
              </button>
              <button onClick={() => setEditingPasscodes(false)} className="text-sm text-gray-500 px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Test Mode */}
      {activeSection === 'test' && showAlarmFeatures && (
        <div className="space-y-4">
          <div className={`bg-white rounded-2xl border-2 p-6 ${isOnTest ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isOnTest ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <FlaskConical className={`h-6 w-6 ${isOnTest ? 'text-amber-600' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">
                  System is {isOnTest ? 'ON TEST' : 'Active'}
                </h3>
                {isOnTest ? (
                  <>
                    <p className="text-sm text-amber-700 mt-1">The monitoring center will NOT dispatch on alarms from this system.</p>
                    {sysTest?.test_start_at && <p className="text-xs text-gray-500 mt-1">Placed on test: {new Date(sysTest.test_start_at).toLocaleString()}</p>}
                    {sysTest?.placed_by && <p className="text-xs text-gray-500">By: {sysTest.placed_by}</p>}
                    {sysTest?.reason && <p className="text-xs text-gray-600 mt-1 italic">Reason: {sysTest.reason}</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Your system is active and being monitored. Place on test before performing system tests or maintenance.</p>
                )}
              </div>
            </div>
          </div>

          {!isOnTest && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Reason for test <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                type="text"
                value={testReason}
                onChange={e => setTestReason(e.target.value)}
                placeholder="e.g., Annual inspection, new panel installation..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              {isOnTest
                ? 'Removing test mode will restore full monitoring. Any alarm signals will dispatch emergency services.'
                : 'Placing on test bypasses monitoring. Alarms will NOT dispatch emergency services during test mode.'}
            </p>
          </div>

          <button
            onClick={toggleTestMode}
            disabled={placingTest}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-60 ${
              isOnTest
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isOnTest ? <><CheckCircle className="h-5 w-5" />Remove from Test Mode</> : <><FlaskConical className="h-5 w-5" />Place on Test Mode</>}
          </button>
        </div>
      )}
    </div>
  );
}

function ContactForm({ form, setForm, onSave, onCancel, saving }: {
  form: any; setForm: any; onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
          <input value={form.name} onChange={(e: any) => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Relationship</label>
          <input value={form.relationship} onChange={(e: any) => setForm((f: any) => ({ ...f, relationship: e.target.value }))} placeholder="e.g., Owner, Manager" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
          <input value={form.phone} onChange={(e: any) => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="555-555-5555" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Alt Phone</label>
          <input value={form.phone_alt} onChange={(e: any) => setForm((f: any) => ({ ...f, phone_alt: e.target.value }))} placeholder="optional" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={form.has_key} onChange={(e: any) => setForm((f: any) => ({ ...f, has_key: e.target.checked }))} className="w-4 h-4 rounded" />
        <span className="text-sm text-gray-700">Has a key to the property</span>
      </label>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving || !form.name || !form.phone} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
          <Save className="h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-500 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}
