import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { Deal } from './types';
import { formatCurrency, getStageColor } from './types';
import DealCard from './DealCard';

interface Column {
  stage: string;
  deals: Deal[];
}

interface Props {
  columns: Column[];
  onStageChange: (dealId: string, newStage: string, oldStage: string) => void;
  onDealClick: (deal: Deal) => void;
  onQuickAdd: (stage: string) => void;
}

export default function KanbanBoard({ columns, onStageChange, onDealClick, onQuickAdd }: Props) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const draggingDeal = useRef<Deal | null>(null);

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    draggingDeal.current = deal;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const deal = draggingDeal.current;
    if (!deal || deal.sales_stage === newStage) return;
    onStageChange(deal.id, newStage, deal.sales_stage);
    draggingDeal.current = null;
  };

  const handleDragLeave = () => setDragOverStage(null);
  const handleDragEnd = () => { draggingDeal.current = null; setDragOverStage(null); };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {columns.map(col => {
        const colValue = col.deals.reduce((s, d) => s + d.value, 0);
        const isOver = dragOverStage === col.stage;

        return (
          <div
            key={col.stage}
            className="flex-shrink-0 w-72"
            onDragOver={e => handleDragOver(e, col.stage)}
            onDrop={e => handleDrop(e, col.stage)}
            onDragLeave={handleDragLeave}
          >
            <div className={`rounded-xl transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'} p-3 h-full`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ${
                    col.deals.length ? 'bg-blue-500' : 'bg-gray-400'
                  }`}>
                    {col.deals.length}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-800 leading-tight">{col.stage}</h3>
                </div>
                <button
                  onClick={() => onQuickAdd(col.stage)}
                  className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {col.deals.length > 0 && (
                <div className="mb-3 text-xs font-semibold text-gray-600 bg-white rounded-md px-2 py-1 inline-block">
                  {formatCurrency(colValue)}
                </div>
              )}

              <div
                className={`space-y-3 min-h-16 transition-colors rounded-lg ${
                  isOver && col.deals.length === 0 ? 'bg-blue-100 ring-2 ring-blue-300 p-2' : ''
                }`}
                onDragEnd={handleDragEnd}
              >
                {col.deals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onClick={onDealClick}
                    onDragStart={handleDragStart}
                  />
                ))}
                {col.deals.length === 0 && !isOver && (
                  <div className="text-center py-8 text-gray-400 text-xs">No deals</div>
                )}
                {col.deals.length === 0 && isOver && (
                  <div className="text-center py-6 text-blue-500 text-xs font-medium">Drop here</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
