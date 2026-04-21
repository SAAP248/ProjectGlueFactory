import { useState } from 'react';
import TicketsList from './TicketsList';
import TicketDetail from './TicketDetail';
import NewTicketModal from './NewTicketModal';
import ConvertToWorkOrderModal from './ConvertToWorkOrderModal';

type View = { type: 'list' } | { type: 'detail'; id: string };

export default function Tickets() {
  const [view, setView] = useState<View>({ type: 'list' });
  const [showNewModal, setShowNewModal] = useState(false);
  const [convertTicketId, setConvertTicketId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleViewTicket(id: string) {
    setView({ type: 'detail', id });
  }

  function handleBack() {
    setView({ type: 'list' });
  }

  function handleTicketSaved(id: string) {
    setShowNewModal(false);
    setRefreshKey(k => k + 1);
    setView({ type: 'detail', id });
  }

  function handleConvertToWorkOrder(ticketId: string) {
    setConvertTicketId(ticketId);
  }

  function handleConversionSaved() {
    setConvertTicketId(null);
    if (view.type === 'detail') {
      setView({ type: 'detail', id: view.id });
    }
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="flex flex-col h-full">
      {view.type === 'list' && (
        <TicketsList
          key={refreshKey}
          onViewTicket={handleViewTicket}
          onNewTicket={() => setShowNewModal(true)}
          refreshKey={refreshKey}
        />
      )}

      {view.type === 'detail' && (
        <TicketDetail
          ticketId={view.id}
          onBack={handleBack}
          onConvertToWorkOrder={handleConvertToWorkOrder}
        />
      )}

      {showNewModal && (
        <NewTicketModal
          onClose={() => setShowNewModal(false)}
          onSaved={handleTicketSaved}
        />
      )}

      {convertTicketId && (
        <ConvertToWorkOrderModal
          ticketId={convertTicketId}
          onClose={() => setConvertTicketId(null)}
          onSaved={handleConversionSaved}
        />
      )}
    </div>
  );
}
