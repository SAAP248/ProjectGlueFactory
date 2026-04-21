import { useState } from 'react';
import WorkOrdersList from './WorkOrdersList';
import WorkOrderDetail from './WorkOrderDetail';
import WorkOrderModal from './WorkOrderModal';

type View = { type: 'list' } | { type: 'detail'; id: string };

export default function WorkOrders() {
  const [view, setView] = useState<View>({ type: 'list' });
  const [editId, setEditId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        />
      )}

      {view.type === 'detail' && (
        <WorkOrderDetail
          workOrderId={view.id}
          onBack={handleBack}
          onEdit={handleEdit}
        />
      )}

      {editId && (
        <WorkOrderModal
          editWorkOrderId={editId}
          onClose={() => setEditId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
