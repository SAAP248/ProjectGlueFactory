export interface PCProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  long_description: string | null;
  category: string | null;
  subcategory: string | null;
  manufacturer: string | null;
  model_number: string | null;
  upc: string | null;
  cost: number;
  raw_cost: number | null;
  price: number;
  msrp: number | null;
  min_sales_price: number | null;
  purchase_account: string | null;
  sales_account: string | null;
  chart_of_accounts: string | null;
  default_system_type: string | null;
  install_hours: number | null;
  install_information: string | null;
  preferred_distributor: string | null;
  tax_code: string | null;
  product_type: string | null;
  is_taxable: boolean | null;
  image_url: string | null;
  product_url: string | null;
  is_active: boolean;
}

export interface PCPhoto {
  id: string;
  product_id: string;
  url: string;
  title: string | null;
  sort_order: number;
  created_at: string;
}

export interface PCDocument {
  id: string;
  product_id: string;
  title: string;
  url: string;
  doc_type: string;
  file_size_bytes: number | null;
  created_at: string;
}

export interface PCNote {
  id: string;
  product_id: string;
  author_name: string;
  content: string;
  is_flagged: boolean;
  is_approved: boolean;
  created_at: string;
}
