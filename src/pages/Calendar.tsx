import { Plus } from 'lucide-react';

export default function Calendar() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
          <p className="text-gray-600 mt-1">Your personal schedule and appointments</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Event
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">Personal calendar view would be displayed here</p>
      </div>
    </div>
  );
}
