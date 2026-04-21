export interface PhotoLabel {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Photo {
  id: string;
  file_url: string;
  caption: string | null;
  company_id: string | null;
  site_id: string | null;
  system_id: string | null;
  taken_at: string;
  uploaded_by: string;
  show_in_portal: boolean;
  created_at: string;
  labels?: PhotoLabel[];
  company_name?: string;
  site_name?: string;
  system_name?: string;
}

export interface PhotoUploadContext {
  companyId?: string;
  siteId?: string;
  systemId?: string;
  companyName?: string;
  siteName?: string;
  systemName?: string;
}

export interface PhotoGalleryFilters {
  search: string;
  labelIds: string[];
  showPortalOnly: boolean;
  dateFrom: string;
  dateTo: string;
}
