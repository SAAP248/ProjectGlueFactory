import { User, Calendar, Flame, Clock } from 'lucide-react';
import type { Deal } from './types';
import {
  getStageColor,
  getDaysInStage,
  getAgingColor,
  isClosingSoon,
  formatCurrency,
  FORECAST_CATEGORIES,
} from './types';

interface Props {
  deal: Deal;
  onClick: (deal: Deal) => void;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  showInstall?: boolean;
}

export default function DealCard({ deal, onClick, onDragStart, showInstall = true }: Props) {
  const days = getDaysInStage(deal.stage_entered_at);
  const closingSoon = isClosingSoon(deal.expected_close_date);
  const forecast = FORECAST_CATEGORIES.find(f => f.value === deal.forecast_category);
  const weightedValue = deal.value * (deal.probability / 100);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, deal)}
      onClick={() => onClick(deal)}
      className={`bg-white rounded-lg p-4 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none ${
        closingSoon ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight pr-2">{deal.title}</h4>
        {closingSoon && <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium truncate">
          {deal.companies?.name ?? '—'}
        </p>
        {deal.assigned_employee && (
          <span className="ml-2 flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <User className="h-3 w-3" />
            {deal.assigned_employee.first_name} {deal.assigned_employee.last_name.charAt(0)}.
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">{formatCurrency(deal.value)}</span>
        {deal.probability > 0 && (
          <span className="text-xs text-gray-500">{formatCurrency(weightedValue)} wtd</span>
        )}
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all"
          style={{ width: `${deal.probability}%` }}
        />
      </div>

      {showInstall && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Install:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStageColor(deal.install_status)}`}>
              {deal.install_status}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
        <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${getAgingColor(days)}`}>
          <Clock className="h-3 w-3" />
          {days}d
        </div>

        {forecast && (
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${forecast.color}`}>
            {forecast.label}
          </span>
        )}

        {deal.expected_close_date && (
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
}
