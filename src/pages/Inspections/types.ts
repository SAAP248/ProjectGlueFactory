export interface InspectionTemplate {
  id: string;
  name: string;
  code: string;
  version: number;
  edition: string | null;
  pages: TemplatePage[];
  is_active: boolean;
  created_at: string;
}

export interface TemplatePage {
  title: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  title: string;
  description?: string;
  fields: TemplateField[];
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'radio' | 'yes_no' | 'yes_no_na' | 'pass_fail' | 'repeating_table' | 'signature';
  required?: boolean;
  options?: string[];
  prefill?: string;
  conditional?: { field: string; value: unknown };
  signer_role?: string;
  columns?: TemplateField[];
}

export interface Inspection {
  id: string;
  inspection_number: string;
  template_id: string;
  work_order_id: string | null;
  company_id: string | null;
  site_id: string | null;
  technician_id: string | null;
  contact_id: string | null;
  status: 'draft' | 'completed';
  inspection_date: string | null;
  inspection_start_time: string | null;
  prefill_data: Record<string, string>;
  completed_at: string | null;
  completed_by: string | null;
  is_edit_unlocked: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  companies?: { name: string } | null;
  sites?: { name: string; address: string } | null;
  employees?: { first_name: string; last_name: string } | null;
  work_orders?: { wo_number: string; title: string } | null;
  inspection_templates?: { name: string; code: string; edition: string | null } | null;
}

export interface InspectionFieldValue {
  id: string;
  inspection_id: string;
  field_id: string;
  page_index: number;
  value: unknown;
  updated_at: string;
}

export interface InspectionSignature {
  id: string;
  inspection_id: string;
  signer_role: string;
  signer_name: string;
  signature_data: string;
  signed_at: string;
}
