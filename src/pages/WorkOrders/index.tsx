import { useState } from 'react';
import WorkOrdersList from './WorkOrdersList';
import WorkOrderDetail from './WorkOrderDetail';
import WorkOrderModal from './WorkOrderModal';
import NewInspectionModal from '../Inspections/NewInspectionModal';

type View = { type: 'list' } | { type: 'detail'; id: string };

interface Props {
  initialFilter?: string;
  onNavigateToInspection?: (inspectionId: string) => void;
}

export default function WorkOrders({ initialFilter, onNavigateToInspection }: Props) {
  const [view, setView] = useState<View>({ type: 'list' });
  const [editId, setEditId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [inspectionModalForWO, setInspectionModalForWO] = useState<string | null>(null);

  function handleViewDetail(id: string) {
    setView({ type: 'detail', id });
  }

  function handleBack() {
    setView({ type: 'list' });
  }

  function handleEdit(id: string) {
    setEditId(id);
  }

  function handleSaved() {
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="flex flex-col h-full">
      {view.type === 'list' && (
        <WorkOrdersList
          key={refreshKey}
          onViewDetail={handleViewDetail}
          initialFilter={initialFilter}
        />
      )}

      {view.type === 'detail' && (
        <WorkOrderDetail
          workOrderId={view.id}
          onBack={handleBack}
          onEdit={handleEdit}
          onAddInspection={(woId) => setInspectionModalForWO(woId)}
        />
      )}

      {editId && (
        <WorkOrderModal
          editWorkOrderId={editId}
          onClose={() => setEditId(null)}
          onSaved={handleSaved}
        />
      )}

      {inspectionModalForWO && (
        <NewInspectionModal
          preselectedWorkOrderId={inspectionModalForWO}
          onClose={() => setInspectionModalForWO(null)}
          onCreate={(inspId) => {
            setInspectionModalForWO(null);
            if (onNavigateToInspection) {
              onNavigateToInspection(inspId);
            }
          }}
        />
      )}
    </div>
  );
}
