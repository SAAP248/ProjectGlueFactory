import { HardHat, Calendar, Users } from 'lucide-react';
import { getStageColor } from './types';

interface InstallWorkOrder {
  id: string;
  wo_number: string;
  status: string;
  work_order_type: string;
  scheduled_date: string | null;
  assigned_employee?: { first_name: string; last_name: string } | null;
}

interface Props {
  installStatus: string | null;
  workOrders: InstallWorkOrder[];
}

export default function DealInstallPanel({ installStatus, workOrders }: Props) {
  const installs = workOrders.filter(w => w.work_order_type === 'installation');
  const upcoming = installs
    .filter(w => w.scheduled_date)
    .sort((a, b) => (a.scheduled_date! < b.scheduled_date! ? -1 : 1));
  const next = upcoming.find(w => w.status !== 'completed' && w.status !== 'cancelled') ?? upcoming[upcoming.length - 1];
  const techs = Array.from(new Set(installs
    .map(w => w.assigned_employee ? `${w.assigned_employee.first_name} ${w.assigned_employee.last_name}` : null)
    .filter((n): n is string => !!n)));

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center gap-2">
          <HardHat className="h-4 w-4 text-amber-600" />
          <h4 className="text-sm font-semibold text-gray-900">Install Information</h4>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getStageColor(installStatus ?? 'Not Scheduled')}`}>
          {installStatus ?? 'Not sold yet'}
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Install date</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {next?.scheduled_date
              ? new Date(next.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Not scheduled'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 flex items-center gap-1"><HardHat className="h-3 w-3" /> Install visits</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{installs.length}</p>
        </div>
        <div className="px-4 py-3 min-w-0">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" /> Crew</p>
          <p className="text-sm font-semibold text-gray-900 mt-1 truncate" title={techs.join(', ')}>
            {techs.length ? techs.join(', ') : 'Unassigned'}
          </p>
        </div>
      </div>
    </div>
  );
}
