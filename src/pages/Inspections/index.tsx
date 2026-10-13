import { useState, useEffect } from 'react';
import { ClipboardCheck, Layers } from 'lucide-react';
import InspectionsList from './InspectionsList';
import InspectionForm from './InspectionForm';
import InspectionPrintPreview from './InspectionPrintPreview';
import NewInspectionModal from './NewInspectionModal';
import TemplatesList from './TemplatesList';
import TemplateDetail from './TemplateDetail';
import { useInspections } from './useInspections';

type Tab = 'inspections' | 'templates';

type View =
  | { type: 'list' }
  | { type: 'form'; id: string }
  | { type: 'preview'; id: string }
  | { type: 'template'; systemId: string };

type Preselected = { companyId: string; siteId: string | null; systemId: string };

interface Props {
  initialInspectionId?: string | null;
  onConsumeInitial?: () => void;
}

export default function Inspections({ initialInspectionId, onConsumeInitial }: Props) {
  const [view, setView] = useState<View>({ type: 'list' });
  const [tab, setTab] = useState<Tab>('inspections');
  const [newModal, setNewModal] = useState<{ preselected?: Preselected } | null>(null);
  const { inspections, loading, reload } = useInspections();

  useEffect(() => {
    if (initialInspectionId) {
      setView({ type: 'form', id: initialInspectionId });
      onConsumeInitial?.();
    }
  }, [initialInspectionId]);

  const modal = newModal && (
    <NewInspectionModal
      preselected={newModal.preselected}
      onClose={() => setNewModal(null)}
      onCreate={(id) => {
        setNewModal(null);
        setView({ type: 'form', id });
        reload();
      }}
    />
  );

  if (view.type === 'form') {
    return (
      <InspectionForm
        inspectionId={view.id}
        onBack={() => { setView({ type: 'list' }); reload(); }}
        onNavigateToPreview={(id) => setView({ type: 'preview', id })}
      />
    );
  }

  if (view.type === 'preview') {
    return (
      <InspectionPrintPreview
        inspectionId={view.id}
        onBack={() => setView({ type: 'form', id: view.id })}
      />
    );
  }

  if (view.type === 'template') {
    return (
      <>
        <TemplateDetail
          systemId={view.systemId}
          onBack={() => setView({ type: 'list' })}
          onStartInspection={(preselected) => setNewModal({ preselected })}
          onOpenInspection={(id) => setView({ type: 'form', id })}
        />
        {modal}
      </>
    );
  }

  const tabs = (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {([
        { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
        { id: 'templates', label: 'Templates', icon: Layers },
      ] as const).map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {tab === 'inspections' ? (
        <InspectionsList
          tabs={tabs}
          inspections={inspections}
          loading={loading}
          onView={(id) => setView({ type: 'form', id })}
          onNew={() => setNewModal({})}
        />
      ) : (
        <TemplatesList tabs={tabs} onOpen={(systemId) => setView({ type: 'template', systemId })} />
      )}
      {modal}
    </>
  );
}
