import { Wrench, PhoneCall } from 'lucide-react';

export type ViewType = 'all' | 'work_orders' | 'sales_calls';

interface Props {
  value: ViewType;
  onChange: (v: ViewType) => void;
}

const options: { value: ViewType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'work_orders', label: 'Work Orders', icon: <Wrench className="h-3.5 w-3.5" /> },
  { value: 'sales_calls', label: 'Sales Calls', icon: <PhoneCall className="h-3.5 w-3.5" /> },
];

export default function ViewTypeFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
