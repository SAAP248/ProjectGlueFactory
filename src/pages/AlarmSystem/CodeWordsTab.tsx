import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AlarmCodeWord } from '../CustomerProfile/types';

interface Props {
  systemId: string;
  codeWords: AlarmCodeWord[];
  onCodeWordsChange: (words: AlarmCodeWord[]) => void;
}

interface WordModalProps {
  word: Partial<AlarmCodeWord>;
  isDuress: boolean;
  onClose: () => void;
  onSave: (w: Partial<AlarmCodeWord>) => Promise<void>;
}

function WordModal({ word: initial, isDuress, onClose, onSave }: WordModalProps) {
  const [form, setForm] = useState<Partial<AlarmCodeWord>>({ ...initial, is_duress: isDuress });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof AlarmCodeWord, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial.id ? 'Edit' : 'Add'} {isDuress ? 'Duress Code' : 'Code Word'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Passcode</label>
            <input className={inputCls} value={form.passcode || ''} onChange={e => set('passcode', e.target.value)} placeholder={isDuress ? 'Enter duress code...' : 'Enter passcode...'} />
          </div>
          {!isDuress && (
            <div>
              <label className={labelCls}>Authority</label>
              <input className={inputCls} value={form.authority || ''} onChange={e => set('authority', e.target.value)} placeholder="e.g. Owner, Manager..." />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.passcode}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CodeWordsTab({ systemId, codeWords, onCodeWordsChange }: Props) {
  const [modal, setModal] = useState<{ word: Partial<AlarmCodeWord>; isDuress: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const regularWords = codeWords.filter(w => !w.is_duress);
  const duressWords = codeWords.filter(w => w.is_duress);

  const handleSave = async (word: Partial<AlarmCodeWord>) => {
    if (word.id) {
      const { data } = await supabase
        .from('alarm_code_words')
        .update({ passcode: word.passcode, authority: word.authority, is_duress: word.is_duress })
        .eq('id', word.id)
        .select()
        .maybeSingle();
      if (data) onCodeWordsChange(codeWords.map(w => w.id === data.id ? (data as AlarmCodeWord) : w));
    } else {
      const { data } = await supabase
        .from('alarm_code_words')
        .insert({ system_id: systemId, passcode: word.passcode, authority: word.authority || '', is_duress: word.is_duress })
        .select()
        .maybeSingle();
      if (data) onCodeWordsChange([...codeWords, data as AlarmCodeWord]);
    }
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('alarm_code_words').delete().eq('id', id);
    onCodeWordsChange(codeWords.filter(w => w.id !== id));
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Code Words</h3>
          <button
            onClick={() => setModal({ word: { system_id: systemId, is_duress: false }, isDuress: false })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Code Word
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Passcode</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Authority</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {regularWords.map(word => (
                <tr key={word.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800">{word.passcode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{word.authority || '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setModal({ word, isDuress: false })}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(word.id)}
                        disabled={deleting === word.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {regularWords.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">No code words defined</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Duress Code</h3>
          <button
            onClick={() => setModal({ word: { system_id: systemId, is_duress: true }, isDuress: true })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Duress Code
          </button>
        </div>

        {duressWords.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No duress codes have been defined</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duress Code</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {duressWords.map(word => (
                  <tr key={word.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800">{word.passcode}</span>
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">Duress</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModal({ word, isDuress: true })}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(word.id)}
                          disabled={deleting === word.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <WordModal
          word={modal.word}
          isDuress={modal.isDuress}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
