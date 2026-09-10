import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Inspection, InspectionTemplate, InspectionFieldValue, TemplateSection } from './types';
import FieldRenderer from './FieldRenderer';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Lock, Unlock, AlertTriangle,
  ClipboardCheck, Clock, FileText, Printer, Smartphone, Monitor,
  Radio, ShieldCheck, ShieldAlert, Timer
} from 'lucide-react';

interface Props {
  inspectionId: string;
  onBack: () => void;
  onNavigateToPreview: (id: string) => void;
}

export default function InspectionForm({ inspectionId, onBack, onNavigateToPreview }: Props) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ field: string; label: string; page: number }[]>([]);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [showOnTestModal, setShowOnTestModal] = useState(false);
  const [onTestStatus, setOnTestStatus] = useState<{ isOnTest: boolean; systemId: string | null }>({ isOnTest: false, systemId: null });
  const [testDuration, setTestDuration] = useState(4);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval>>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isCompleted = inspection?.status === 'completed' && !inspection?.is_edit_unlocked;
  const isEditable = inspection?.status === 'draft' || inspection?.is_edit_unlocked;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [inspRes, valsRes] = await Promise.all([
        supabase
          .from('inspections')
          .select(`*, companies(name), sites(name, address), employees(first_name, last_name), work_orders(wo_number, title), inspection_templates(*)`)
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

        // Check if the site's alarm system is on test
        const siteId = (inspRes.data as any).site_id;
        if (siteId) {
          const { data: sysData } = await supabase
            .from('customer_systems')
            .select('id, is_on_test')
            .eq('site_id', siteId)
            .limit(1)
            .maybeSingle();
          if (sysData) {
            setOnTestStatus({ isOnTest: !!sysData.is_on_test, systemId: sysData.id });
          }
        }
      }

      if (valsRes.data) {
        const map: Record<string, unknown> = {};
        (valsRes.data as InspectionFieldValue[]).forEach(fv => {
          map[fv.field_id] = fv.value;
        });
        setFieldValues(map);
      }
      setLoading(false);
    }
    load();
  }, [inspectionId]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (dirty && isEditable) {
        saveFieldValues();
      }
    }, 30000);
    return () => clearInterval(autoSaveTimer.current);
  }, [dirty, isEditable, fieldValues]);

  const updateField = useCallback((fieldId: string, value: unknown) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    setDirty(true);
  }, []);

  const saveFieldValues = useCallback(async () => {
    if (!inspection) return;
    setSaving(true);
    const entries = Object.entries(fieldValues);
    const upserts = entries.map(([field_id, value]) => {
      const pageIdx = findPageForField(template, field_id);
      return {
        inspection_id: inspection.id,
        field_id,
        page_index: pageIdx,
        value: value as any,
        updated_at: new Date().toISOString(),
      };
    });

    if (upserts.length > 0) {
      await supabase
        .from('inspection_field_values')
        .upsert(upserts, { onConflict: 'inspection_id,field_id' });
    }

    await supabase
      .from('inspections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', inspection.id);

    setSaving(false);
    setLastSaved(new Date());
    setDirty(false);
  }, [inspection, fieldValues, template]);

  const handlePageChange = useCallback(async (newPage: number) => {
    if (dirty && isEditable) {
      await saveFieldValues();
    }
    setCurrentPage(newPage);
    // Scroll to top of the form content
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [dirty, isEditable, saveFieldValues]);

  const validateAll = useCallback((): { field: string; label: string; page: number }[] => {
    if (!template) return [];
    const errors: { field: string; label: string; page: number }[] = [];
    template.pages.forEach((page, pageIdx) => {
      page.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.conditional) {
            const depVal = fieldValues[field.conditional.field];
            if (depVal !== field.conditional.value && String(depVal) !== String(field.conditional.value)) {
              return;
            }
          }
          if (field.required) {
            const val = fieldValues[field.id];
            if (val === undefined || val === null || val === '' ||
              (field.type === 'signature' && !val)) {
              errors.push({ field: field.id, label: field.label, page: pageIdx });
            }
          }
        });
      });
    });
    return errors;
  }, [template, fieldValues]);

  const handleComplete = useCallback(async () => {
    const errors = validateAll();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowCompleteConfirm(false);
      return;
    }
    setValidationErrors([]);
    await saveFieldValues();
    await supabase
      .from('inspections')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: inspection?.employees
          ? `${inspection.employees.first_name} ${inspection.employees.last_name}`
          : 'Unknown',
        is_edit_unlocked: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inspectionId);

    setInspection(prev => prev ? {
      ...prev,
      status: 'completed',
      completed_at: new Date().toISOString(),
      is_edit_unlocked: false,
    } : null);
    setShowCompleteConfirm(false);
  }, [validateAll, saveFieldValues, inspection, inspectionId]);

  const handleUnlock = useCallback(async () => {
    await supabase
      .from('inspections')
      .update({ is_edit_unlocked: true, status: 'draft', completed_at: null, updated_at: new Date().toISOString() })
      .eq('id', inspectionId);
    setInspection(prev => prev ? { ...prev, is_edit_unlocked: true, status: 'draft', completed_at: null } : null);
    setShowUnlockConfirm(false);
  }, [inspectionId]);

  const handlePutOnTest = useCallback(async () => {
    if (!onTestStatus.systemId) return;
    await supabase
      .from('customer_systems')
      .update({ is_on_test: true, updated_at: new Date().toISOString() })
      .eq('id', onTestStatus.systemId);
    setOnTestStatus(prev => ({ ...prev, isOnTest: true }));
    updateField('mon_on_test', true);
    updateField('mon_test_duration', testDuration);
    setShowOnTestModal(false);
  }, [onTestStatus.systemId, testDuration, updateField]);

  const handleTakeOffTest = useCallback(async () => {
    if (!onTestStatus.systemId) return;
    await supabase
      .from('customer_systems')
      .update({ is_on_test: false, updated_at: new Date().toISOString() })
      .eq('id', onTestStatus.systemId);
    setOnTestStatus(prev => ({ ...prev, isOnTest: false }));
    updateField('mon_on_test', false);
  }, [onTestStatus.systemId, updateField]);

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
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-4">&larr; Back</button>
        <p className="text-gray-500">Inspection not found.</p>
      </div>
    );
  }

  const pages = template.pages;
  const page = pages[currentPage];
  const totalFields = countAllFields(template);
  const filledFields = countFilledFields(template, fieldValues);
  const completionPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  // Check if current page is page 1 (has monitoring section) for the "Put on Test" button
  const isPage1 = currentPage === 0;
  const hasAlarmSystem = !!onTestStatus.systemId;

  const formContent = (
    <>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-bold text-gray-900 truncate">{inspection.inspection_number}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {isCompleted ? 'Completed' : 'Draft'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {inspection.companies?.name || 'No customer'}{inspection.sites?.name ? ` — ${inspection.sites.name}` : ''}
              {inspection.work_orders ? ` | WO ${inspection.work_orders.wo_number}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {lastSaved && !mobilePreview && (
            <span className="text-xs text-gray-400 items-center gap-1 hidden sm:flex">
              <Clock className="h-3 w-3" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {saving && <span className="text-xs text-blue-500 animate-pulse">Saving...</span>}

          {/* Mobile preview toggle */}
          <button
            onClick={() => setMobilePreview(!mobilePreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              mobilePreview
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title={mobilePreview ? 'Exit Mobile Preview' : 'View on Mobile'}
          >
            {mobilePreview ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{mobilePreview ? 'Desktop' : 'Mobile'}</span>
          </button>

          {isEditable && !mobilePreview && (
            <button
              onClick={saveFieldValues}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {isCompleted && !mobilePreview && (
            <>
              <button
                onClick={() => onNavigateToPreview(inspection.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Report</span>
              </button>
              <button
                onClick={() => setShowUnlockConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Unlock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </>
          )}

          {isEditable && !mobilePreview && (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Complete</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar + page tabs */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{completionPct}% complete</span>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {pages.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePageChange(idx)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                idx === currentPage
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'
              }`}
            >
              <span className={`flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold ${
                idx === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {idx + 1}
              </span>
              <span className="hidden md:inline">{p.title.replace(/^Page \d+:\s*/, '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* On-Test status banner */}
      {isPage1 && hasAlarmSystem && (
        <div className={`px-4 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 ${
          onTestStatus.isOnTest ? 'bg-emerald-50 border-b border-emerald-200' : 'bg-amber-50 border-b border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {onTestStatus.isOnTest ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            )}
            <span className={`text-sm font-medium ${onTestStatus.isOnTest ? 'text-emerald-700' : 'text-amber-700'}`}>
              {onTestStatus.isOnTest
                ? 'Alarm system is currently ON TEST'
                : 'Alarm system is NOT on test'}
            </span>
          </div>
          {isEditable && (
            onTestStatus.isOnTest ? (
              <button
                onClick={handleTakeOffTest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Radio className="h-3.5 w-3.5" />
                Take Off Test
              </button>
            ) : (
              <button
                onClick={() => setShowOnTestModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg hover:bg-emerald-200 transition-colors"
              >
                <Radio className="h-3.5 w-3.5" />
                Put on Test
              </button>
            )
          )}
        </div>
      )}

      {/* Validation errors banner */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {validationErrors.length} required field{validationErrors.length > 1 ? 's' : ''} missing
              </p>
              <div className="mt-1 space-y-0.5">
                {validationErrors.slice(0, 10).map(err => (
                  <button
                    key={err.field}
                    onClick={() => { setCurrentPage(err.page); setValidationErrors([]); }}
                    className="block text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Page {err.page + 1}: {err.label}
                  </button>
                ))}
                {validationErrors.length > 10 && (
                  <p className="text-xs text-red-500">...and {validationErrors.length - 10} more</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{page.title}</h2>
          </div>

          {page.sections.map((section, si) => (
            <SectionRenderer
              key={si}
              section={section}
              fieldValues={fieldValues}
              onFieldChange={updateField}
              disabled={!isEditable}
            />
          ))}

          {/* Page navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {currentPage + 1} of {pages.length}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pages.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-30 transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full">
      {mobilePreview ? (
        <div className="flex flex-col h-full bg-gray-100">
          {/* Mobile preview chrome */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Mobile Preview</span>
              <span className="text-xs text-gray-400">375 x 812</span>
            </div>
            <button
              onClick={() => setMobilePreview(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Monitor className="h-3.5 w-3.5" />
              Exit Preview
            </button>
          </div>

          {/* Phone frame */}
          <div className="flex-1 flex items-start justify-center overflow-y-auto py-6">
            <div className="w-[375px] min-h-[812px] bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-gray-800 overflow-hidden flex flex-col relative">
              {/* Phone notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-gray-800 rounded-b-2xl z-10" />
              {/* Status bar */}
              <div className="h-12 bg-gray-800 flex items-end justify-between px-8 pb-1 flex-shrink-0">
                <span className="text-[10px] text-white font-medium">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2.5 border border-white rounded-sm relative">
                    <div className="absolute inset-0.5 bg-white rounded-[1px]" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
              {/* Form content inside phone */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {formContent}
              </div>
              {/* Home indicator */}
              <div className="h-8 flex items-center justify-center flex-shrink-0 bg-white">
                <div className="w-32 h-1 bg-gray-300 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        formContent
      )}

      {/* Put on Test modal */}
      {showOnTestModal && (
        <Modal onClose={() => setShowOnTestModal(false)}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Radio className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Put System on Test</h3>
                <p className="text-sm text-gray-500">This will mark the alarm system as "on test" with the central station.</p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Duration</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {[2, 4, 8].map(h => (
                    <button
                      key={h}
                      onClick={() => setTestDuration(h)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        testDuration === h
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {h} hrs
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Timer className="h-3.5 w-3.5" />
                  Duration
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowOnTestModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePutOnTest}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Confirm - Put on Test
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Unlock confirmation modal */}
      {showUnlockConfirm && (
        <Modal onClose={() => setShowUnlockConfirm(false)}>
          <div className="p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Edit Completed Inspection?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This inspection has been completed. Editing it will change its status back to Draft.
              Are you sure you want to continue?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowUnlockConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
              >
                Yes, Edit Inspection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete confirmation modal */}
      {showCompleteConfirm && (
        <Modal onClose={() => setShowCompleteConfirm(false)}>
          <div className="p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Complete Inspection?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will lock the inspection. You will need to confirm if you want to edit it later.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Complete Inspection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SectionRenderer({ section, fieldValues, onFieldChange, disabled }: {
  section: TemplateSection;
  fieldValues: Record<string, unknown>;
  onFieldChange: (fieldId: string, value: unknown) => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-800">{section.title}</h3>
        {section.description && <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>}
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.fields.map(field => {
            const isWide = field.type === 'textarea' || field.type === 'repeating_table' || field.type === 'signature' || field.type === 'photo_gallery';
            return (
              <div key={field.id} className={isWide ? 'md:col-span-2' : ''}>
                <FieldRenderer
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={(v) => onFieldChange(field.id, v)}
                  disabled={disabled}
                  allValues={fieldValues}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">{children}</div>
    </div>
  );
}

function findPageForField(template: InspectionTemplate | null, fieldId: string): number {
  if (!template) return 0;
  for (let i = 0; i < template.pages.length; i++) {
    for (const section of template.pages[i].sections) {
      if (section.fields.some(f => f.id === fieldId)) return i;
    }
  }
  return 0;
}

function countAllFields(template: InspectionTemplate): number {
  let count = 0;
  template.pages.forEach(p => p.sections.forEach(s => s.fields.forEach(f => {
    if (f.type !== 'repeating_table' && f.type !== 'photo_gallery') count++;
  })));
  return count;
}

function countFilledFields(template: InspectionTemplate, values: Record<string, unknown>): number {
  let count = 0;
  template.pages.forEach(p => p.sections.forEach(s => s.fields.forEach(f => {
    if (f.type !== 'repeating_table' && f.type !== 'photo_gallery') {
      const v = values[f.id];
      if (v !== undefined && v !== null && v !== '') count++;
    }
  })));
  return count;
}
