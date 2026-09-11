export type UserRole = 'admin' | 'team_member';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface price_lists {
  id: string;
  name: string;
  currency: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  price_list_id: string;
  unit_price: number;
  currency?: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  model_number?: string;
  category_id?: string;
  category?: Category;
  description?: string;
  specifications?: string;
  hsn_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  prices?: ProductPrice[];
}

export interface product_price_history {
  id: string;
  product_id: string;
  price_list_id: string;
  old_price: number | null;
  new_price: number;
  changed_by_user_id?: string;
  changed_by?: UserProfile;
  price_list?: price_lists;
  change_reason?: string;
  changed_at: string;
}

export interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  created_at: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  product_name: string;
  description?: string;
  sku: string;
  model_number?: string;
  master_price: number;
  unit_price: number;
  quantity: number;
  discount_percent: number;
  line_total: number;
  created_at: string;
}

export interface Quotation {
  revision: number;
  company_snapshot: CompanySettings;
  discount_amount: number;
  id: string;
  quotation_number: string;
  financial_year: string;
  sequence_number: number;
  customer_id: string;
  customer_name: string;
  customer_contact_person?: string;
  customer_address?: string;
  customer_city?: string;
  customer_country?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_tax_number?: string;
  customer_reference?: string;
  price_list_id: string;
  price_list_name: string;
  currency: string;
  status: QuotationStatus;
  quotation_date: string;
  valid_until: string;
  subtotal: number;
  packaging_charges: number;
  freight_charges: number;
  insurance_charges: number;
  other_charges: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string;
  delivery_terms: string;
  warranty_terms: string;
  validity_terms: string;
  freight_terms: string;
  notes?: string;
  created_by_user_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  items: QuotationItem[];
}

export interface CompanySettings {
  revision?: number;
  id: string;
  company_name: string;
  company_tagline?: string;
  logo_path?: string;
  terms_template_version?: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
  gstin: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_no: string;
  bank_ifsc: string;
  bank_swift?: string;
  bank_branch?: string;
  bank_accounts?: Array<{
    bank_name: string;
    account_name: string;
    account_no: string;
    ifsc: string;
    branch?: string;
    swift?: string;
  }>;
  payment_terms_default: string;
  delivery_terms_default: string;
  warranty_terms_default: string;
  validity_days_default: number;
  freight_terms_default: string;
  quotation_prefix: string;
  default_notes?: string;
}

export interface QuotationItemForm {
  product_id: string;
  product_name: string;
  description?: string;
  sku: string;
  model_number?: string;
  master_price: number;
  unit_price: number;
  quantity: number;
  discount_percent: number;
  line_total: number;
}

export interface QuotationFormState {
  discount_amount?: number;
  revision?: number;
  customer_id: string;
  price_list_id: string;
  currency: string;
  quotation_date: string;
  valid_until: string;
  items: QuotationItemForm[];
  subtotal: number;
  packaging_charges: number;
  freight_charges: number;
  insurance_charges: number;
  other_charges: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  payment_terms: string;
  delivery_terms: string;
  warranty_terms: string;
  validity_terms: string;
  freight_terms: string;
  customer_reference?: string;
  notes?: string;
}
