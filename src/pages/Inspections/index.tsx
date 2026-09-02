import { useState } from 'react';
import InspectionsList from './InspectionsList';
import { useInspections } from './useInspections';

type View = { type: 'list' } | { type: 'detail'; id: string };

export default function Inspections() {
  const [view, setView] = useState<View>({ type: 'list' });
  const { inspections, loading, reload } = useInspections();

  if (view.type === 'detail') {
    // Inspection form will be built in the next phase
    return (
      <div className="p-6">
        <button
          onClick={() => { setView({ type: 'list' }); reload(); }}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          &larr; Back to Inspections
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Inspection form will appear here (next phase).</p>
          <p className="text-xs text-gray-400 mt-1">ID: {view.id}</p>
        </div>
      </div>
    );
  }

  return (
    <InspectionsList
      inspections={inspections}
      loading={loading}
      onView={(id) => setView({ type: 'detail', id })}
      onNew={() => {/* Will be wired in next phase */}}
    />
  );
}
