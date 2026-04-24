import { Car, MapPin, Coffee, CheckCircle, AlertCircle, RotateCcw, Play } from 'lucide-react';
import type { TechAction } from './types';

export interface ActionDef {
  label: string;
  action: TechAction;
  color: string;
  icon: React.ElementType;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function getTechActions(wotStatus: string): ActionDef[] {
  switch (wotStatus) {
    case 'assigned':
      return [
        { label: 'Start Driving', action: 'start_driving', color: 'bg-blue-600 hover:bg-blue-700', icon: Car, variant: 'primary' },
      ];
    case 'enroute':
      return [
        { label: "I've Arrived", action: 'arrived', color: 'bg-teal-600 hover:bg-teal-700', icon: MapPin, variant: 'primary' },
      ];
    case 'onsite':
    case 'working':
      return [
        { label: 'Complete Job', action: 'complete', color: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle, variant: 'primary' },
        { label: 'Pause', action: 'take_break', color: 'bg-amber-500 hover:bg-amber-600', icon: Coffee, variant: 'secondary' },
        { label: 'Cannot Complete', action: 'cannot_complete', color: 'bg-red-500 hover:bg-red-600', icon: AlertCircle, variant: 'danger' },
        { label: 'Mark as Go-Back', action: 'go_back', color: 'bg-orange-500 hover:bg-orange-600', icon: RotateCcw, variant: 'danger' },
      ];
    case 'on_break':
      return [
        { label: 'Resume Work', action: 'resume_work', color: 'bg-emerald-600 hover:bg-emerald-700', icon: Play, variant: 'primary' },
      ];
    case 'completed':
      return [];
    default:
      return [
        { label: 'Start Driving', action: 'start_driving', color: 'bg-blue-600 hover:bg-blue-700', icon: Car, variant: 'primary' },
      ];
  }
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  emergency: 'bg-red-100 text-red-700',
};

export const WOT_STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-gray-100 text-gray-600',
  enroute: 'bg-blue-100 text-blue-700',
  onsite: 'bg-emerald-100 text-emerald-700',
  working: 'bg-emerald-100 text-emerald-700',
  on_break: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export const WOT_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  enroute: 'Enroute',
  onsite: 'Working',
  working: 'Working',
  on_break: 'Paused',
  completed: 'Completed',
};
