import type { TemplateField } from './types';
import SignaturePad from './SignaturePad';
import { Plus, Trash2 } from 'lucide-react';

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
                  <th key={col.id} className="px-2 py-2 text-left text-xs font-semibold text-gray-500 min-w-[120px]">
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
                      {col.type === 'select' ? (
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
