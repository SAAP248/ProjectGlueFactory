import { Car, MapPin, Wrench, Coffee, CheckCircle, AlertCircle, RotateCcw, Play } from 'lucide-react';
import type { TechAction } from './types';

export interface ActionDef {
  label: string;
  action: TechAction;
  color: string;
  icon: React.ElementType;
}

export function getTechActions(wotStatus: string): ActionDef[] {
  switch (wotStatus) {
    case 'assigned':
      return [{ label: 'Start Driving', action: 'start_driving', color: 'bg-blue-600 hover:bg-blue-700', icon: Car }];
    case 'enroute':
      return [{ label: "I've Arrived", action: 'arrived', color: 'bg-teal-600 hover:bg-teal-700', icon: MapPin }];
    case 'onsite':
      return [
        { label: 'Begin Work', action: 'begin_work', color: 'bg-emerald-600 hover:bg-emerald-700', icon: Wrench },
        { label: 'Take a Break', action: 'take_break', color: 'bg-amber-500 hover:bg-amber-600', icon: Coffee },
      ];
    case 'working':
      return [
        { label: 'Complete Job', action: 'complete', color: 'bg-emerald-600 hover:bg-emerald-700', icon: CheckCircle },
        { label: 'Take a Break', action: 'take_break', color: 'bg-amber-500 hover:bg-amber-600', icon: Coffee },
        { label: 'Cannot Complete', action: 'cannot_complete', color: 'bg-red-500 hover:bg-red-600', icon: AlertCircle },
        { label: 'Mark as Go-Back', action: 'go_back', color: 'bg-orange-500 hover:bg-orange-600', icon: RotateCcw },
      ];
    case 'on_break':
      return [{ label: 'Resume Work', action: 'resume_work', color: 'bg-emerald-600 hover:bg-emerald-700', icon: Play }];
    case 'completed':
      return [];
    default:
      return [{ label: 'Start Driving', action: 'start_driving', color: 'bg-blue-600 hover:bg-blue-700', icon: Car }];
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
  onsite: 'bg-teal-100 text-teal-700',
  working: 'bg-emerald-100 text-emerald-700',
  on_break: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export const WOT_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  enroute: 'Enroute',
  onsite: 'On Site',
  working: 'Working',
  on_break: 'On Break',
  completed: 'Completed',
};
