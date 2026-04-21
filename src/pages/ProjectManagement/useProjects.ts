import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Project, ProjectPhase, ChangeOrder, ProgressInvoice, ProjectRMR, ProjectBudgetLine } from './types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        companies:company_id ( name ),
        sites:site_id ( name, address, city, state ),
        project_manager:project_manager_id ( first_name, last_name ),
        lead_technician:lead_technician_id ( first_name, last_name ),
        phases:project_phases ( id, name, status, phase_order, labor_budget, materials_budget, other_budget, labor_actual, materials_actual, other_actual, scheduled_start_date, scheduled_end_date, actual_start_date, actual_end_date, gate_met, gate_requirement )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      const sorted = (data || []).map(p => ({
        ...p,
        phases: (p.phases || []).sort((a: ProjectPhase, b: ProjectPhase) => a.phase_order - b.phase_order)
      }));
      setProjects(sorted as Project[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useProjectDetail(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [progressInvoices, setProgressInvoices] = useState<ProgressInvoice[]>([]);
  const [rmr, setRmr] = useState<ProjectRMR | null>(null);
  const [budgetLines, setBudgetLines] = useState<ProjectBudgetLine[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    const [projRes, phasesRes, coRes, piRes, rmrRes, blRes] = await Promise.all([
      supabase
        .from('projects')
        .select(`
          *,
          companies:company_id ( name ),
          sites:site_id ( name, address, city, state ),
          project_manager:project_manager_id ( first_name, last_name ),
          lead_technician:lead_technician_id ( first_name, last_name )
        `)
        .eq('id', projectId)
        .maybeSingle(),
      supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_order'),
      supabase
        .from('change_orders')
        .select(`*, line_items:change_order_line_items(*)`)
        .eq('project_id', projectId)
        .order('created_at'),
      supabase
        .from('progress_invoices')
        .select(`*, phases:phase_id(name)`)
        .eq('project_id', projectId)
        .order('created_at'),
      supabase
        .from('project_rmr')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle(),
      supabase
        .from('project_budget_lines')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at'),
    ]);

    if (projRes.data) setProject(projRes.data as Project);
    if (phasesRes.data) setPhases(phasesRes.data as ProjectPhase[]);
    if (coRes.data) setChangeOrders(coRes.data as ChangeOrder[]);
    if (piRes.data) setProgressInvoices(piRes.data as ProgressInvoice[]);
    if (rmrRes.data) setRmr(rmrRes.data as ProjectRMR);
    if (blRes.data) setBudgetLines(blRes.data as ProjectBudgetLine[]);
    setLoading(false);
  }

  useEffect(() => {
    if (projectId) fetchAll();
  }, [projectId]);

  async function updatePhaseStatus(phaseId: string, status: string) {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'in_progress') updates.actual_start_date = new Date().toISOString().split('T')[0];
    if (status === 'completed') updates.actual_end_date = new Date().toISOString().split('T')[0];
    await supabase.from('project_phases').update(updates).eq('id', phaseId);
    await fetchAll();
  }

  async function updateCOStatus(coId: string, status: string, approvedBy?: string) {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'approved') {
      updates.approved_date = new Date().toISOString().split('T')[0];
      if (approvedBy) updates.approved_by = approvedBy;
    }
    if (status === 'rejected') updates.rejected_date = new Date().toISOString().split('T')[0];
    await supabase.from('change_orders').update(updates).eq('id', coId);
    await fetchAll();
  }

  return {
    project,
    phases,
    changeOrders,
    progressInvoices,
    rmr,
    budgetLines,
    loading,
    refetch: fetchAll,
    updatePhaseStatus,
    updateCOStatus,
  };
}
