import type { TemplateField } from './types';
import SignaturePad from './SignaturePad';
import { Plus, Trash2, Camera, Image, X, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface Props {
  field: TemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  allValues: Record<string, unknown>;
}

export default function FieldRenderer({ field, value, onChange, disabled, allValues }: Props) {
  if (field.conditional) {
    const depVal = allValues[field.conditional.field];
    if (depVal !== field.conditional.value && String(depVal) !== String(field.conditional.value)) {
      return null;
    }
  }

  const baseInput = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:bg-gray-50 disabled:text-gray-500';

  switch (field.type) {
    case 'text':
      return (
        <div>
          <Label field={field} />
          <input
            type="text"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={baseInput}
          />
        </div>
      );

    case 'textarea':
      return (
        <div>
          <Label field={field} />
          <textarea
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            rows={3}
            className={`${baseInput} resize-y`}
          />
        </div>
      );

    case 'number':
      return (
        <div>
          <Label field={field} />
          <input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            disabled={disabled}
            className={baseInput}
          />
        </div>
      );

    case 'date':
      return (
        <div>
          <Label field={field} />
          <input
            type="date"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={baseInput}
          />
        </div>
      );

    case 'time':
      return (
        <div>
          <Label field={field} />
          <input
            type="time"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={baseInput}
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <Label field={field} />
          <select
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={baseInput}
          >
            <option value="">Select...</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{field.label}</span>
          {field.required && <span className="text-red-400 text-xs">*</span>}
        </label>
      );

    case 'yes_no':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-2">
            {['Yes', 'No'].map(opt => (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt === 'Yes')}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  (opt === 'Yes' && value === true) || (opt === 'No' && value === false)
                    ? opt === 'Yes'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );

    case 'yes_no_na':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-2">
            {[{ label: 'Yes', val: 'yes' }, { label: 'No', val: 'no' }, { label: 'N/A', val: 'na' }].map(opt => (
              <button
                key={opt.val}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.val)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  value === opt.val
                    ? opt.val === 'yes'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : opt.val === 'no'
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'pass_fail':
      return (
        <div>
          <Label field={field} />
          <div className="flex gap-2">
            {[{ label: 'Pass', val: 'pass' }, { label: 'Fail', val: 'fail' }, { label: 'N/A', val: 'na' }].map(opt => (
              <button
                key={opt.val}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.val)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  value === opt.val
                    ? opt.val === 'pass'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : opt.val === 'fail'
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'signature':
      return (
        <div>
          <Label field={field} />
          <SignaturePad
            value={(value as string) || null}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      );

    case 'repeating_table':
      return <RepeatingTable field={field} value={value} onChange={onChange} disabled={disabled} />;

    case 'photo_gallery':
      return <PhotoGallery field={field} value={value} onChange={onChange} disabled={disabled} />;

    default:
      return (
        <div>
          <Label field={field} />
          <input
            type="text"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={baseInput}
          />
        </div>
      );
  }
}

function Label({ field }: { field: TemplateField }) {
  if (field.type === 'checkbox') return null;
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function RepeatingTable({ field, value, onChange, disabled }: {
  field: TemplateField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const columns = field.columns || [];
  const rows = (Array.isArray(value) ? value : []) as Record<string, string>[];
  const [photoPickerCell, setPhotoPickerCell] = useState<{ row: number; col: string } | null>(null);

  const addRow = () => {
    const empty: Record<string, string> = {};
    columns.forEach(c => { empty[c.id] = ''; });
    onChange([...rows, empty]);
  };

  const updateCell = (rowIdx: number, colId: string, val: string) => {
    const updated = rows.map((r, i) => i === rowIdx ? { ...r, [colId]: val } : r);
    onChange(updated);
  };

  const removeRow = (rowIdx: number) => {
    onChange(rows.filter((_, i) => i !== rowIdx));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                {columns.map(col => (
                  <th key={col.id} className={`px-2 py-2 text-left text-xs font-semibold text-gray-500 ${col.type === 'photo' ? 'min-w-[80px]' : 'min-w-[120px]'}`}>
                    {col.label}
                  </th>
                ))}
                {!disabled && <th className="px-2 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (disabled ? 1 : 2)} className="px-4 py-6 text-center text-gray-400 text-sm">
                    No rows added yet
                  </td>
                </tr>
              ) : rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50/50">
                  <td className="px-2 py-1.5 text-xs text-gray-400 font-mono">{ri + 1}</td>
                  {columns.map(col => (
                    <td key={col.id} className="px-1 py-1">
                      {col.type === 'photo' ? (
                        <TablePhotoCell
                          value={row[col.id] || ''}
                          disabled={disabled}
                          isPickerOpen={photoPickerCell?.row === ri && photoPickerCell?.col === col.id}
                          onOpenPicker={() => setPhotoPickerCell({ row: ri, col: col.id })}
                          onClosePicker={() => setPhotoPickerCell(null)}
                          onSelect={(url) => { updateCell(ri, col.id, url); setPhotoPickerCell(null); }}
                          onClear={() => updateCell(ri, col.id, '')}
                        />
                      ) : col.type === 'select' ? (
                        <select
                          value={row[col.id] || ''}
                          onChange={e => updateCell(ri, col.id, e.target.value)}
                          disabled={disabled}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="">--</option>
                          {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={row[col.id] || ''}
                          onChange={e => updateCell(ri, col.id, e.target.value)}
                          disabled={disabled}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      )}
                    </td>
                  ))}
                  {!disabled && (
                    <td className="px-1 py-1">
                      <button type="button" onClick={() => removeRow(ri)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabled && (
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const PRODUCT_DEMO_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=120&h=120&fit=crop', label: 'Panel' },
  { url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=120&h=120&fit=crop', label: 'Strobe' },
  { url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=120&h=120&fit=crop', label: 'Detector' },
  { url: 'https://images.unsplash.com/photo-1565439441965-6fcf24154938?w=120&h=120&fit=crop', label: 'Pull station' },
  { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=120&h=120&fit=crop', label: 'Device' },
  { url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=120&h=120&fit=crop', label: 'Wiring' },
];

function TablePhotoCell({ value, disabled, isPickerOpen, onOpenPicker, onClosePicker, onSelect, onClear }: {
  value: string;
  disabled?: boolean;
  isPickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onSelect: (url: string) => void;
  onClear: () => void;
}) {
  if (value) {
    return (
      <div className="relative group w-14 h-14">
        <img src={value} alt="Product" className="w-14 h-14 rounded object-cover border border-gray-200" />
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-2.5 w-2.5 text-white" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {!disabled ? (
        <button
          type="button"
          onClick={onOpenPicker}
          className="w-14 h-14 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-blue-300 hover:text-blue-400 transition-colors"
        >
          <Camera className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-14 h-14 rounded border border-gray-100 bg-gray-50 flex items-center justify-center">
          <Image className="h-4 w-4 text-gray-200" />
        </div>
      )}
      {isPickerOpen && (
        <div className="absolute top-0 left-16 z-30 bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-[200px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Select Photo</span>
            <button type="button" onClick={onClosePicker} className="text-gray-400 hover:text-gray-600">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {PRODUCT_DEMO_PHOTOS.map((p) => (
              <button
                key={p.url}
                type="button"
                onClick={() => onSelect(p.url)}
                className="rounded overflow-hidden border border-gray-100 hover:border-blue-400 hover:ring-1 hover:ring-blue-200 transition-all"
              >
                <img src={p.url} alt={p.label} className="w-full h-14 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop', label: 'Fire alarm panel front' },
  { url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop', label: 'Wiring interior' },
  { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop', label: 'Battery backup' },
  { url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop', label: 'Smoke detector ceiling' },
  { url: 'https://images.unsplash.com/photo-1565439441965-6fcf24154938?w=400&h=300&fit=crop', label: 'Pull station hallway' },
  { url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop', label: 'Strobe notification' },
];

interface PhotoItem {
  url: string;
  caption: string;
  timestamp: string;
}

function PhotoGallery({ field, value, onChange, disabled }: {
  field: TemplateField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const photos = (Array.isArray(value) ? value : []) as PhotoItem[];

  const addPhoto = () => {
    if (!selectedDemo) return;
    const newPhoto: PhotoItem = {
      url: selectedDemo,
      caption,
      timestamp: new Date().toLocaleString(),
    };
    onChange([...photos, newPhoto]);
    setShowPicker(false);
    setCaption('');
    setSelectedDemo(null);
  };

  const removePhoto = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Camera className="inline h-4 w-4 mr-1 -mt-0.5" />
        {field.label}
      </label>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={photo.url}
                alt={photo.caption || `Photo ${idx + 1}`}
                className="w-full h-28 object-cover"
              />
              {photo.caption && (
                <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                  <p className="text-xs text-gray-600 line-clamp-2 flex items-start gap-1">
                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
                    {photo.caption}
                  </p>
                </div>
              )}
              <div className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-black/50 text-[10px] text-white rounded-tl">
                {photo.timestamp}
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && !showPicker && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-3 w-full border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
        >
          <Camera className="h-4 w-4" />
          Take / Attach Photo
        </button>
      )}

      {!disabled && showPicker && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Select a Photo (Demo)</p>
            <button type="button" onClick={() => { setShowPicker(false); setSelectedDemo(null); setCaption(''); }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_PHOTOS.map((dp) => (
              <button
                key={dp.url}
                type="button"
                onClick={() => setSelectedDemo(dp.url)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  selectedDemo === dp.url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img src={dp.url} alt={dp.label} className="w-full h-16 object-cover" />
                <p className="text-[10px] text-gray-500 px-1 py-0.5 truncate bg-white">{dp.label}</p>
                {selectedDemo === dp.url && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Image className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Describe the issue or condition..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={addPhoto}
            disabled={!selectedDemo}
            className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Attach Photo
          </button>
        </div>
      )}
    </div>
  );
}