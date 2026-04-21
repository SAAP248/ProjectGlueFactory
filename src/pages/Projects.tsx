import { Plus, Briefcase, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function Projects() {
  const stats = [
    { label: 'Active Projects', value: '23', color: 'bg-blue-500' },
    { label: 'Planning', value: '8', color: 'bg-yellow-500' },
    { label: 'In Progress', value: '12', color: 'bg-green-500' },
    { label: 'Completed This Month', value: '7', color: 'bg-purple-500' },
  ];

  const projects = [
    {
      id: 1,
      name: 'Enterprise Security Upgrade',
      company: 'Acme Corporation',
      status: 'In Progress',
      type: 'Installation',
      budget: 75000,
      actualCost: 42000,
      progress: 60,
      startDate: '2024-02-15',
      endDate: '2024-04-30',
      manager: 'Mike Johnson',
      tasks: { total: 24, completed: 14 }
    },
    {
      id: 2,
      name: 'Mall Camera System',
      company: 'Downtown Mall',
      status: 'In Progress',
      type: 'Installation',
      budget: 125000,
      actualCost: 89000,
      progress: 75,
      startDate: '2024-01-10',
      endDate: '2024-03-25',
      manager: 'David Brown',
      tasks: { total: 32, completed: 24 }
    },
    {
      id: 3,
      name: 'Office Access Control',
      company: 'Tech Solutions Inc',
      status: 'Planning',
      type: 'Installation',
      budget: 42000,
      actualCost: 5000,
      progress: 15,
      startDate: '2024-03-01',
      endDate: '2024-05-15',
      manager: 'Sarah Williams',
      tasks: { total: 18, completed: 3 }
    },
    {
      id: 4,
      name: 'Warehouse Security',
      company: 'Smith Warehouse',
      status: 'In Progress',
      type: 'Installation',
      budget: 38000,
      actualCost: 28000,
      progress: 80,
      startDate: '2024-02-01',
      endDate: '2024-03-20',
      manager: 'Mike Johnson',
      tasks: { total: 15, completed: 12 }
    },
  ];

  const kanbanStages = [
    { name: 'Planning', projects: [projects[2]] },
    { name: 'In Progress', projects: [projects[0], projects[1], projects[3]] },
    { name: 'Review', projects: [] },
    { name: 'Completed', projects: [] },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Review': return 'bg-purple-100 text-purple-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage installation projects and track progress</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-12 h-12 rounded-xl`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Kanban Board</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Switch to List View
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {kanbanStages.map((stage, stageIndex) => (
            <div key={stageIndex} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                <span className="text-sm text-gray-600">{stage.projects.length}</span>
              </div>
              <div className="space-y-3">
                {stage.projects.map((project) => (
                  <div key={project.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{project.name}</h4>
                      <Briefcase className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{project.company}</p>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center text-gray-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {project.tasks.completed}/{project.tasks.total} tasks
                      </div>
                      <div className="text-gray-600">
                        ${(project.actualCost / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">All Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actual Cost</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-600">{project.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.company}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${project.budget.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${project.actualCost.toLocaleString()}</div>
                    <div className={`text-xs ${project.actualCost > project.budget ? 'text-red-600' : 'text-green-600'}`}>
                      {((project.actualCost / project.budget) * 100).toFixed(0)}% of budget
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {project.tasks.completed}/{project.tasks.total} tasks
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{project.startDate}</div>
                    <div className="text-xs text-gray-600">to {project.endDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.manager}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
