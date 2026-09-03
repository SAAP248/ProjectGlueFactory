import { useState, useEffect } from 'react';
import InspectionsList from './InspectionsList';
import InspectionForm from './InspectionForm';
import InspectionPrintPreview from './InspectionPrintPreview';
import NewInspectionModal from './NewInspectionModal';
import { useInspections } from './useInspections';

type View =
  | { type: 'list' }
  | { type: 'form'; id: string }
  | { type: 'preview'; id: string };

interface Props {
  initialInspectionId?: string | null;
  onConsumeInitial?: () => void;
}

export default function Inspections({ initialInspectionId, onConsumeInitial }: Props) {
  const [view, setView] = useState<View>({ type: 'list' });
  const [showNewModal, setShowNewModal] = useState(false);
  const { inspections, loading, reload } = useInspections();

  useEffect(() => {
    if (initialInspectionId) {
      setView({ type: 'form', id: initialInspectionId });
      onConsumeInitial?.();
    }
  }, [initialInspectionId]);

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

  return (
    <>
      <InspectionsList
        inspections={inspections}
        loading={loading}
        onView={(id) => setView({ type: 'form', id })}
        onNew={() => setShowNewModal(true)}
      />
      {showNewModal && (
        <NewInspectionModal
          onClose={() => setShowNewModal(false)}
          onCreate={(id) => {
            setShowNewModal(false);
            setView({ type: 'form', id });
            reload();
          }}
        />
      )}
    </>
  );
}
