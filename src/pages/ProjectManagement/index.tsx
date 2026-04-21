import { useState } from 'react';
import ProjectList from './ProjectList';
import ProjectDetail from './ProjectDetail';
import PhaseTemplateManager from './PhaseTemplates/index';

type View = { type: 'list' } | { type: 'detail'; id: string } | { type: 'templates' };

export default function ProjectManagement() {
  const [view, setView] = useState<View>({ type: 'list' });

  if (view.type === 'detail') {
    return (
      <ProjectDetail
        projectId={view.id}
        onBack={() => setView({ type: 'list' })}
      />
    );
  }

  if (view.type === 'templates') {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <button
            onClick={() => setView({ type: 'list' })}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-1 transition-colors"
          >
            ← Projects
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <PhaseTemplateManager />
        </div>
      </div>
    );
  }

  return (
    <ProjectList
      onViewProject={(id) => setView({ type: 'detail', id })}
      onManageTemplates={() => setView({ type: 'templates' })}
    />
  );
}
