export interface DocumentCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
  description: string | null;
  category_id: string | null;
  company_id: string | null;
  site_id: string | null;
  system_id: string | null;
  uploaded_by: string;
  show_in_portal: boolean;
  created_at: string;
  document_categories?: DocumentCategory | null;
  companies?: { name: string } | null;
  sites?: { name: string } | null;
  customer_systems?: { name: string } | null;
}

export interface DocumentUploadContext {
  companyId?: string;
  siteId?: string;
  systemId?: string;
  companyName?: string;
  siteName?: string;
  systemName?: string;
}

export interface DocumentFilters {
  search: string;
  categoryIds: string[];
  showPortalOnly: boolean;
  dateFrom: string;
  dateTo: string;
  sortBy: 'newest' | 'oldest' | 'name' | 'size';
}

export const EMPTY_FILTERS: DocumentFilters = {
  search: '',
  categoryIds: [],
  showPortalOnly: false,
  dateFrom: '',
  dateTo: '',
  sortBy: 'newest',
};
