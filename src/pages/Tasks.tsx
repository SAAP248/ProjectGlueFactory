import { Plus, CheckCircle } from 'lucide-react';

export default function Tasks() {
  const tasks = [
    { id: 1, title: 'Follow up with Acme Corp on proposal', assignedTo: 'Mike Johnson', dueDate: '2024-03-18', priority: 'High', status: 'Pending' },
    { id: 2, title: 'Order parts for Smith Residence', assignedTo: 'Sarah Williams', dueDate: '2024-03-19', priority: 'Normal', status: 'Pending' },
    { id: 3, title: 'Schedule annual inspection', assignedTo: 'David Brown', dueDate: '2024-03-20', priority: 'Normal', status: 'Completed' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Assignable reminders and action items</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="h-5 w-5 mr-2" />
          New Task
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <CheckCircle className={`h-5 w-5 mr-3 ${task.status === 'Completed' ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900'}>{task.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{task.assignedTo}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{task.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Edit
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
