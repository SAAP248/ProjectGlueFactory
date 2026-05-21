import { useEffect, useState } from 'react';
import { MapPin, Calendar as CalendarIcon, Clock, CalendarDays } from 'lucide-react';
import MapView from './MapView';
import CalendarView from './CalendarView';
import DailyDispatchView from './DailyDispatchView';

type DispatchView = 'daily' | 'weekly' | 'monthly' | 'map';
const STORAGE_KEY = 'dispatch:view';

const VIEWS: { key: DispatchView; label: string; icon: typeof Clock }[] = [
  { key: 'daily', label: 'Daily', icon: Clock },
  { key: 'weekly', label: 'Weekly', icon: CalendarDays },
  { key: 'monthly', label: 'Monthly', icon: CalendarIcon },
  { key: 'map', label: 'Map', icon: MapPin },
];

export default function Dispatch() {
  const [view, setView] = useState<DispatchView>(() => {
    if (typeof window === 'undefined') return 'daily';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (VIEWS.some(v => v.key === stored)) return stored as DispatchView;
    return 'daily';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, view);
    }
  }, [view]);

  const descriptions: Record<DispatchView, string> = {
    daily: 'Daily schedule showing each technician and their assigned jobs.',
    weekly: 'Week view of work orders and sales appointments.',
    monthly: 'Monthly calendar of work orders and sales appointments.',
    map: 'Live view of technicians, sales calls, and scheduled jobs.',
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-600 mt-1">{descriptions[view]}</p>
        </div>

        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'daily' && <DailyDispatchView />}
      {view === 'weekly' && <CalendarView defaultMode="week" />}
      {view === 'monthly' && <CalendarView defaultMode="month" />}
      {view === 'map' && <MapView />}
    </div>
  );
}
