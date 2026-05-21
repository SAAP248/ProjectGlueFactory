import { useEffect, useState } from 'react';
import { MapPin, Calendar as CalendarIcon, Clock } from 'lucide-react';
import MapView from './MapView';
import CalendarView from './CalendarView';
import DailyDispatchView from './DailyDispatchView';

type DispatchView = 'daily' | 'map' | 'calendar';
const STORAGE_KEY = 'dispatch:view';

export default function Dispatch() {
  const [view, setView] = useState<DispatchView>(() => {
    if (typeof window === 'undefined') return 'daily';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'calendar' || stored === 'map' || stored === 'daily') return stored;
    return 'daily';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, view);
    }
  }, [view]);

  const descriptions: Record<DispatchView, string> = {
    daily: 'Daily schedule showing each technician and their assigned jobs.',
    map: 'Live view of technicians, sales calls, and scheduled jobs.',
    calendar: 'Monthly calendar of work orders and sales appointments.',
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-600 mt-1">{descriptions[view]}</p>
        </div>

        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'daily'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            Daily
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Map
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              view === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {view === 'daily' && <DailyDispatchView />}
      {view === 'map' && <MapView />}
      {view === 'calendar' && <CalendarView />}
    </div>
  );
}
