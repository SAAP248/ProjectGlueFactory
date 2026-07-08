import { useState, useMemo } from 'react';
import { Search, Plus, Users, Filter } from 'lucide-react';
import { useEmployees } from './useEmployees';
import { useRole } from '../../contexts/RoleContext';
import EmployeeDetail from './EmployeeDetail';
import EmployeeModal from './EmployeeModal';
import type { Employee } from './types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  accounting: 'Accounting',
  sales_manager: 'Sales Manager',
  sales: 'Sales',
  csr: 'CSR',
  dispatcher: 'Dispatcher',
  tech_manager: 'Tech Manager',
  technician: 'Technician',
  tech: 'Technician',
  limited_tech: 'Limited Tech',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  terminated: 'bg-red-100 text-red-700',
};

export default function UserManagement() {
  const { role } = useRole();
  const canViewCompensation = role === 'admin' || role === 'accounting';
  const { employees, loading, refetch } = useEmployees();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  const roles = useMemo(() => {
    const r = new Set(employees.map(e => e.role));
    return Array.from(r).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
      if (deptFilter !== 'all' && emp.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const full = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        return full.includes(q) || emp.email.toLowerCase().includes(q) || (emp.phone || '').includes(q);
      }
      return true;
    });
  }, [employees, search, roleFilter, statusFilter, deptFilter]);

  const selected = employees.find(e => e.id === selectedId) || null;

  function handleEdit(emp: Employee) {
    setEditingEmployee(emp);
    setShowModal(true);
  }

  function handleCreate() {
    setEditingEmployee(null);
    setShowModal(true);
  }

  function handleSaved() {
    setShowModal(false);
    setEditingEmployee(null);
    refetch();
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500">{employees.length} team member{employees.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d!}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* List + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Employee List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">No employees match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedId(emp.id)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors hover:bg-white ${
                    selectedId === emp.id ? 'bg-white border-l-3 border-l-blue-600 shadow-sm' : ''
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: emp.color || '#64748b' }}
                  >
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{emp.title || ROLE_LABELS[emp.role] || emp.role}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[emp.status] || STATUS_STYLES.inactive}`}>
                    {emp.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selected ? (
            <EmployeeDetail
              employee={selected}
              canViewCompensation={canViewCompensation}
              onEdit={() => handleEdit(selected)}
              onRefetch={refetch}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Select an employee to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          canViewCompensation={canViewCompensation}
          onClose={() => { setShowModal(false); setEditingEmployee(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
