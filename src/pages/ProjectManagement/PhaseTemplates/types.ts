export interface PhaseTemplateItem {
  id: string;
  template_id: string;
  name: string;
  phase_order: number;
  gate_requirement?: string | null;
  created_at: string;
}

export interface PhaseTemplate {
  id: string;
  name: string;
  description?: string | null;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
  items?: PhaseTemplateItem[];
}
