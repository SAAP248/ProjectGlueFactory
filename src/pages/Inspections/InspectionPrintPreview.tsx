import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer, CheckCircle2, XCircle, MinusCircle, ClipboardCheck } from 'lucide-react';
import type { Inspection, InspectionTemplate, InspectionFieldValue, TemplatePage, TemplateSection, TemplateField } from './types';

interface Props {
  inspectionId: string;
  onBack: () => void;
}

export default function InspectionPrintPreview({ inspectionId, onBack }: Props) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [inspRes, valsRes] = await Promise.all([
        supabase
          .from('inspections')
          .select('*, companies(name), sites(name, address), employees(first_name, last_name), work_orders(wo_number, title), inspection_templates(*)')
          .eq('id', inspectionId)
          .maybeSingle(),
        supabase
          .from('inspection_field_values')
          .select('*')
          .eq('inspection_id', inspectionId),
      ]);
      if (inspRes.data) {
        setInspection(inspRes.data as Inspection);
        const tmpl = (inspRes.data as any).inspection_templates as InspectionTemplate;
        if (tmpl) setTemplate(tmpl);
      }
      if (valsRes.data) {
        const map: Record<string, unknown> = {};
        (valsRes.data as InspectionFieldValue[]).forEach(fv => { map[fv.field_id] = fv.value; });
        setFieldValues(map);
      }
      setLoading(false);
    }
    load();
  }, [inspectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!inspection || !template) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-700 font-medium">&larr; Back</button>
        <p className="text-gray-500 mt-4">Inspection not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar - hidden in print */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden flex-shrink-0">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Form
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="flex-1 overflow-y-auto bg-gray-100 print:bg-white">
        <div className="max-w-[8.5in] mx-auto my-6 print:my-0">
          {template.pages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="bg-white shadow-sm mb-6 print:mb-0 print:shadow-none print:break-after-page last:print:break-after-auto"
              style={{ padding: '0.75in 0.75in 0.5in' }}
            >
              {/* Page header */}
              <div className="border-b-2 border-gray-900 pb-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">NFPA 72 Fire Alarm Inspection &amp; Testing Report</h1>
                    <p className="text-[10px] text-gray-500">{template.edition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700">{inspection.inspection_number}</p>
                    <p className="text-[10px] text-gray-500">
                      {page.title.replace(/^Page \d+:\s*/, '')} &mdash; Page {pageIdx + 1} of {template.pages.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections */}
              {page.sections.map((section, si) => (
                <PrintSection key={si} section={section} fieldValues={fieldValues} />
              ))}

              {/* Page footer */}
              <div className="mt-4 pt-2 border-t border-gray-300 flex items-center justify-between text-[9px] text-gray-400">
                <span>{inspection.companies?.name} &mdash; {inspection.sites?.name}</span>
                <span>Generated {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrintSection({ section, fieldValues }: { section: TemplateSection; fieldValues: Record<string, unknown> }) {
  return (
    <div className="mb-4">
      <h2 className="text-[11px] font-bold text-gray-900 bg-gray-100 px-2 py-1 border border-gray-300 uppercase tracking-wide">
        {section.title}
      </h2>
      {section.description && (
        <p className="text-[9px] text-gray-500 px-2 py-0.5 italic">{section.description}</p>
      )}
      <div className="border-x border-b border-gray-300">
        {section.fields.map(field => (
          <PrintField key={field.id} field={field} fieldValues={fieldValues} />
        ))}
      </div>
    </div>
  );
}

function PrintField({ field, fieldValues }: { field: TemplateField; fieldValues: Record<string, unknown> }) {
  const value = fieldValues[field.id];

  if (field.conditional) {
    const depVal = fieldValues[field.conditional.field];
    if (depVal !== field.conditional.value && String(depVal) !== String(field.conditional.value)) {
      return null;
    }
  }

  if (field.type === 'repeating_table') {
    return <PrintRepeatingTable field={field} value={value} />;
  }

  if (field.type === 'signature') {
    return (
      <div className="px-2 py-2 border-b border-gray-200 last:border-b-0">
        <p className="text-[10px] font-medium text-gray-600 mb-1">{field.label}</p>
        {value ? (
          <img src={value as string} alt="Signature" className="h-[50px] object-contain" />
        ) : (
          <div className="h-[50px] border-b border-gray-400 w-[250px]" />
        )}
      </div>
    );
  }

  const displayVal = formatValue(field, value);

  // For yes/no/na and pass/fail, use a compact row layout
  if (field.type === 'yes_no' || field.type === 'yes_no_na' || field.type === 'pass_fail') {
    return (
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 last:border-b-0">
        <span className="text-[10px] text-gray-700 flex-1">{field.label}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getResultStyle(value)}`}>
          {displayVal || '---'}
        </span>
      </div>
    );
  }

  // Textarea - full width
  if (field.type === 'textarea') {
    if (!value) return null;
    return (
      <div className="px-2 py-1.5 border-b border-gray-200 last:border-b-0">
        <p className="text-[10px] font-medium text-gray-600">{field.label}</p>
        <p className="text-[10px] text-gray-800 whitespace-pre-wrap mt-0.5">{String(value)}</p>
      </div>
    );
  }

  // Default: label + value row
  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-200 last:border-b-0">
      <span className="text-[10px] text-gray-600 w-[45%] flex-shrink-0">{field.label}</span>
      <span className="text-[10px] text-gray-900 font-medium">{displayVal || '---'}</span>
    </div>
  );
}

function PrintRepeatingTable({ field, value }: { field: TemplateField; value: unknown }) {
  const columns = field.columns || [];
  const rows = (Array.isArray(value) ? value : []) as Record<string, string>[];

  if (rows.length === 0) return null;

  return (
    <div className="px-0 py-1">
      <table className="w-full text-[9px] border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-1 py-1 text-left font-semibold text-gray-600 border border-gray-300">#</th>
            {columns.map(col => (
              <th key={col.id} className="px-1 py-1 text-left font-semibold text-gray-600 border border-gray-300">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="px-1 py-0.5 border border-gray-200 text-gray-400">{ri + 1}</td>
              {columns.map(col => (
                <td key={col.id} className="px-1 py-0.5 border border-gray-200 text-gray-800">
                  {row[col.id] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(field: TemplateField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  switch (field.type) {
    case 'yes_no':
      return value === true ? 'Yes' : value === false ? 'No' : String(value);
    case 'yes_no_na':
      return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value === 'na' ? 'N/A' : String(value);
    case 'pass_fail':
      return value === 'pass' ? 'Pass' : value === 'fail' ? 'Fail' : value === 'na' ? 'N/A' : String(value);
    case 'checkbox':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

function getResultStyle(value: unknown): string {
  if (value === true || value === 'yes' || value === 'pass') return 'bg-emerald-50 text-emerald-700';
  if (value === false || value === 'no' || value === 'fail') return 'bg-red-50 text-red-700';
  if (value === 'na') return 'bg-gray-100 text-gray-500';
  return 'text-gray-400';
}
