import { useState } from 'react';
import { Menu, Bell, User } from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';
import GlobalSearch from './GlobalSearch';
import type { SearchRecordType } from './GlobalSearch/searchApi';
import { useRole } from '../contexts/RoleContext';

interface HeaderProps {
  onMenuClick: () => void;
  onRoleChange?: () => void;
  onOpenRecord: (type: SearchRecordType, id: string) => void;
}

export default function Header({ onMenuClick, onRoleChange, onOpenRecord }: HeaderProps) {
  const { meta } = useRole();
  const [currentTime, setCurrentTime] = useState(new Date());

  useState(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <GlobalSearch onOpenRecord={onOpenRecord} />
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(currentTime)}, {formatTime(currentTime)}
          </div>
          <div className="text-xs text-gray-500">Powered by WorkhorseSCS</div>
        </div>

        <RoleSwitcher onRoleChange={onRoleChange} />

        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className={`w-9 h-9 ${meta.avatarBg} rounded-full flex items-center justify-center`}>
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">John Doe</div>
            <div className={`text-xs ${meta.color}`}>{meta.label}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
