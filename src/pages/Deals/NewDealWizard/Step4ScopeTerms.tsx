import { useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Info } from 'lucide-react';
import type { WizardState } from './types';

interface Props {
  state: WizardState;
  onChange: (updates: Partial<WizardState>) => void;
}

export default function Step4ScopeTerms({ state, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [photoToast, setPhotoToast] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    setPhotoToast(true);
    setTimeout(() => setPhotoToast(false), 3000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Scope, Terms & Details</h2>
        <p className="text-sm text-gray-500">Describe the work to be done and set the proposal terms.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Scope of Work <span className="text-gray-400 normal-case font-normal">(shown on proposal)</span>
          </label>
          <textarea
            rows={7}
            placeholder="Describe in detail what will be installed, where, and any special requirements. This section is visible to the customer."
            value={state.scopeOfWork}
            onChange={e => onChange({ scopeOfWork: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Installation Notes <span className="text-gray-400 normal-case font-normal">(internal — not shown on proposal)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Notes for the install team: conduit runs, wiring gauge, special access requirements, tools needed…"
            value={state.internalNotes}
            onChange={e => onChange({ internalNotes: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-amber-50 border-amber-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Terms & Conditions</label>
          <textarea
            rows={7}
            placeholder="Terms and conditions for this proposal…"
            value={state.termsAndConditions}
            onChange={e => onChange({ termsAndConditions: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono"
          />
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Proposal Expiration Date</label>
          <input
            type="date"
            value={state.expirationDate}
            onChange={e => onChange({ expirationDate: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">Photo Attachments</p>
            <p className="text-xs text-gray-500 mt-0.5">Attach site photos, floor plans, or reference images to the proposal.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            File upload coming soon
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Upload className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Drag & drop files here</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB each</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <ImageIcon className="h-3.5 w-3.5" /> Photos
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <FileText className="h-3.5 w-3.5" /> PDFs
            </div>
          </div>
        </div>

        {photoToast && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <Info className="h-4 w-4 shrink-0" />
            File upload will be available in a future update.
            <button onClick={() => setPhotoToast(false)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
