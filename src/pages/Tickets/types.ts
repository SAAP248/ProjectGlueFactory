export type TicketStatus = 'open' | 'pending' | 'on_hold' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketType = 'support' | 'billing' | 'sales' | 'technical' | 'complaint' | 'general';
export type TicketSource = 'office' | 'phone_call' | 'email' | 'portal' | 'chat';
export type LinkedRecordType = 'site' | 'system' | 'deal' | 'invoice' | 'work_order';

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  ticket_type: TicketType;
  source: TicketSource;
  company_id: string | null;
  assigned_to: string | null;
  show_in_customer_portal: boolean;
  created_by_portal_user_id: string | null;
  due_date: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  converted_to_work_order_id: string | null;
  converted_to_task_id: string | null;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
  employees?: { first_name: string; last_name: string } | null;
  comment_count?: number;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  body: string;
  is_public: boolean;
  author_employee_id: string | null;
  author_portal_user_id: string | null;
  created_at: string;
  updated_at: string;
  employees?: { first_name: string; last_name: string } | null;
  customer_portal_users?: { first_name: string; last_name: string } | null;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  uploaded_by_employee_id: string | null;
  uploaded_by_portal_user_id: string | null;
  created_at: string;
}

export interface TicketLinkedRecord {
  id: string;
  ticket_id: string;
  record_type: LinkedRecordType;
  record_id: string;
  created_at: string;
  display_name?: string;
}

export interface TicketTimelineEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  description: string;
  actor_employee_id: string | null;
  actor_portal_user_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  employees?: { first_name: string; last_name: string } | null;
}

export interface TicketDetail extends Ticket {
  comments: TicketComment[];
  attachments: TicketAttachment[];
  linked_records: TicketLinkedRecord[];
  timeline: TicketTimelineEvent[];
}

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; dot: string }> = {
  open:     { label: 'Open',     color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
  on_hold:    { label: 'On Hold',     color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'   },
  in_progress: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-700',    dot: 'bg-cyan-500'   },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
  closed:   { label: 'Closed',   color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-300'   },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-500'   },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600'   },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700'     },
};

export const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: 'support',   label: 'Support'   },
  { value: 'billing',   label: 'Billing'   },
  { value: 'sales',     label: 'Sales'     },
  { value: 'technical', label: 'Technical' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'general',   label: 'General'   },
];

export const SOURCE_OPTIONS: { value: TicketSource; label: string }[] = [
  { value: 'office',     label: 'Office'     },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'email',      label: 'Email'      },
  { value: 'portal',     label: 'Portal'     },
  { value: 'chat',       label: 'Chat'       },
];
