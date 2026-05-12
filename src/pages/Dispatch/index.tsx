import { useEffect, useState } from 'react';
import { MapPin, Calendar as CalendarIcon } from 'lucide-react';
import MapView from './MapView';
import CalendarView from './CalendarView';

type DispatchView = 'map' | 'calendar';
const STORAGE_KEY = 'dispatch:view';

export default function Dispatch() {
  const [view, setView] = useState<DispatchView>(() => {
    if (typeof window === 'undefined') return 'map';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'calendar' ? 'calendar' : 'map';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, view);
    }
  }, [view]);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-600 mt-1">
            {view === 'map'
              ? 'Live view of technicians, sales calls, and scheduled jobs.'
              : 'Schedule and manage work orders and sales appointments.'}
          </p>
        </div>

        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
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

      {view === 'map' ? <MapView /> : <CalendarView />}
    </div>
  );
}
