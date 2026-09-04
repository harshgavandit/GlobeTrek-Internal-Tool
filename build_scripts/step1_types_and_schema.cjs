const { writeFile } = require('./helper.cjs');

const typesContent = export type UserRole = 'admin' | 'team_member' | 'sales' | 'manager' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  department?: string;
  created_at: string;
  last_login_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  product_code: string; // SKU (e.g. GT-SOIL-001)
  name: string;
  category_id: string;
  category_name?: string;
  keywords: string;
  short_description: string;
  technical_specs: string;
  unit: string; // Nos, Sets, Pcs, Mtr
  hsn_code: string;
  gst_rate: number; // e.g. 18 for 18%
  image_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  prices?: Record<string, number>; // price_list_id -> price
}

export interface PriceList {
  id: string;
  name: string; // 'India Standard', 'Dealer', 'Export USD', 'Export EUR'
  code: string; // 'INR_STD', 'INR_DLR', 'EXP_USD', 'EXP_EUR'
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
  symbol: string; // '₹', '$', '€', '£', 'AED'
  description?: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  price_list_id: string;
  price: number;
  updated_at: string;
  updated_by?: string;
}

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  price_list_id: string;
  price_list_name?: string;
  currency?: string;
  symbol?: string;
  old_price: number;
  new_price: number;
  changed_by: string;
  changed_at: string;
  notes?: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  gst_tax_id?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type QuotationStatus = 'draft' | 'generated' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuotationItem {
  id: string;
  quotation_id?: string;
  product_id: string;
  item_order: number;
  product_code: string;
  product_name: string;
  product_description: string;
  technical_specs?: string;
  unit: string;
  hsn_code?: string;
  master_price: number;
  quoted_price: number;
  quantity: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
  price_variance?: {
    diff: number;
    percent: number;
  };
  notes?: string;
}

export interface QuotationCommercialCharges {
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  discount_amount: number;
  packing_charges: number;
  freight_charges: number;
  insurance_charges: number;
  gst_tax_rate: number;
  gst_tax_amount: number;
  other_charges: number;
}

export interface QuotationTerms {
  payment_terms: string;
  delivery_period: string;
  validity: string;
  warranty: string;
  packing_terms: string;
  freight_terms: string;
  country_of_origin: string;
  tax_terms: string;
  general_terms: string;
  notes?: string;
}

export interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
  swift_code: string;
  branch: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  tagline?: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  gst_number: string;
  iec_code: string;
  pan_number?: string;
  logo_url: string;
  signature_url?: string;
  authorized_signatory_name: string;
  authorized_signatory_title: string;
  bank_details: BankDetails;
  default_terms: QuotationTerms;
  quotation_prefix: string;
  current_financial_year: string;
  next_sequence_number: number;
  updated_at: string;
  updated_by?: string;
}

export interface Quotation {
  id: string;
  quotation_number: string; // e.g. 'GEC/QTN/2026-27/0001'
  revision_number: number;
  parent_quotation_id?: string;
  customer_id: string;
  customer_snapshot: Customer;
  price_list_id: string;
  price_list_snapshot: PriceList;
  currency: string;
  currency_symbol: string;
  quotation_date: string;
  valid_until: string;
  status: QuotationStatus;
  items: QuotationItem[];
  subtotal: number;
  charges: QuotationCommercialCharges;
  grand_total: number;
  amount_in_words: string;
  terms: QuotationTerms;
  bank_snapshot: BankDetails;
  company_snapshot: Partial<CompanySettings>;
  created_by: string;
  created_by_name: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: 'quotation' | 'product' | 'price' | 'customer' | 'user' | 'import';
  entity_id: string;
  details: string;
  created_at: string;
}
;

writeFile('src/types/index.ts', typesContent);

const schemaSql = -- Globetrek Engineering Database Schema
-- Scalable Quotation Management System

CREATE EXTENSION IF NOT EXISTS  uuid-ossp;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'team_member' CHECK (role IN ('admin', 'team_member', 'sales', 'manager', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT true,
    department TEXT DEFAULT 'Engineering & Sales',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    keywords TEXT DEFAULT '',
    short_description TEXT NOT NULL DEFAULT '',
    technical_specs TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT 'Nos',
    hsn_code TEXT NOT NULL DEFAULT '',
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00 CHECK (gst_rate >= 0),
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'AED')),
    symbol VARCHAR(5) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
    price NUMERIC(15,2) NOT NULL CHECK (price >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id),
    CONSTRAINT unique_product_price_list UNIQUE (product_id, price_list_id)
);

CREATE TABLE IF NOT EXISTS public.product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
    old_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    new_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    changed_by TEXT NOT NULL DEFAULT 'System Admin',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    address TEXT NOT NULL,
    gst_tax_id TEXT,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.quotation_sequences (
    financial_year VARCHAR(20) PRIMARY KEY,
    prefix VARCHAR(20) NOT NULL DEFAULT 'GEC/QTN',
    current_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_quotation_number(p_fy VARCHAR DEFAULT '2026-27', p_prefix VARCHAR DEFAULT 'GEC/QTN')
RETURNS TEXT AS 
DECLARE
    v_next_val INTEGER;
    v_formatted_num TEXT;
BEGIN
    INSERT INTO public.quotation_sequences (financial_year, prefix, current_value, updated_at)
    VALUES (p_fy, p_prefix, 1, NOW())
    ON CONFLICT (financial_year)
    DO UPDATE SET 
        current_value = public.quotation_sequences.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO v_next_val;

    v_formatted_num := p_prefix || '/' || p_fy || '/' || LPAD(v_next_val::TEXT, 4, '0');
    RETURN v_formatted_num;
END;
 LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number TEXT UNIQUE NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 0,
    parent_quotation_id UUID REFERENCES public.quotations(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    customer_snapshot JSONB NOT NULL,
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id),
    price_list_snapshot JSONB NOT NULL,
    currency VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(5) NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'accepted', 'rejected', 'expired')),
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    charges JSONB NOT NULL,
    grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_in_words TEXT NOT NULL DEFAULT '',
    terms JSONB NOT NULL,
    bank_snapshot JSONB NOT NULL,
    company_snapshot JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_by_name TEXT NOT NULL DEFAULT 'Globetrek Team',
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    item_order INTEGER NOT NULL DEFAULT 1,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_description TEXT NOT NULL,
    technical_specs TEXT,
    unit TEXT NOT NULL,
    hsn_code TEXT,
    master_price NUMERIC(15,2) NOT NULL,
    quoted_price NUMERIC(15,2) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(15,2) NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    tagline TEXT,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    website TEXT NOT NULL,
    gst_number TEXT NOT NULL,
    iec_code TEXT NOT NULL,
    pan_number TEXT,
    logo_url TEXT,
    signature_url TEXT,
    authorized_signatory_name TEXT NOT NULL,
    authorized_signatory_title TEXT NOT NULL,
    bank_details JSONB NOT NULL,
    default_terms JSONB NOT NULL,
    quotation_prefix TEXT NOT NULL DEFAULT 'GEC/QTN',
    current_financial_year TEXT NOT NULL DEFAULT '2026-27',
    next_sequence_number INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_products_code ON public.products (product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (active);
CREATE INDEX IF NOT EXISTS idx_product_prices_prod ON public.product_prices (product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_list ON public.product_prices (price_list_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (company_name);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON public.quotations (quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON public.quotations (quotation_date);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations (status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_qid ON public.quotation_items (quotation_id);
;

writeFile('supabase/schema.sql', schemaSql);

const seedSql = -- Seed Data for Globetrek Engineering
-- Test scenario (Section 48)

INSERT INTO public.categories (id, name, slug, description) VALUES
('c1111111-1111-1111-1111-111111111111', 'Soil Testing Equipment', 'soil-testing', 'Equipment for soil testing, CBR, compaction and permeability'),
('c2222222-2222-2222-2222-222222222222', 'Bitumen Testing Equipment', 'bitumen-testing', 'Asphalt, bitumen, ductility and Marshall stability machines'),
('c3333333-3333-3333-3333-333333333333', 'Concrete Testing Equipment', 'concrete-testing', 'Compression testing machines, slump cones and cube moulds'),
('c4444444-4444-4444-4444-444444444444', 'Test Sieves & Shakers', 'test-sieves', 'Standard brass and stainless steel test sieves'),
('c5555555-5555-5555-5555-555555555555', 'Cement Testing Equipment', 'cement-testing', 'Vicat apparatus, autoclave and tensile testers'),
('c6666666-6666-6666-6666-666666666666', 'Aggregate Testing Equipment', 'aggregate-testing', 'Impact testers, abrasion machines and flakiness gauges')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.price_lists (id, name, code, currency, symbol, description, is_default) VALUES
('p1111111-1111-1111-1111-111111111111', 'India Standard', 'INR_STD', 'INR', '₹', 'Standard Domestic Indian Rupee Pricing', true),
('p2222222-2222-2222-2222-222222222222', 'Dealer', 'INR_DLR', 'INR', '₹', 'Domestic Wholesale / Dealer Discounted Pricing', false),
('p3333333-3333-3333-3333-333333333333', 'Export USD', 'EXP_USD', 'USD', '$', 'International Export Quotation Pricing in US Dollars', false),
('p4444444-4444-4444-4444-444444444444', 'Export EUR', 'EXP_EUR', 'EUR', '€', 'International Export Quotation Pricing in Euros', false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.customers (id, company_name, contact_person, email, phone, country, address, gst_tax_id, notes) VALUES
('a1111111-1111-1111-1111-111111111111', 'ABC Engineering LLC', 'David Kamau', 'david@abcengkenya.com', '+254 700 123456', 'Kenya', 'Industrial Area, Enterprise Road, Nairobi, Kenya', 'PIN-P051234567Z', 'Major highway construction contractor in East Africa')
ON CONFLICT DO NOTHING;

INSERT INTO public.products (id, product_code, name, category_id, keywords, short_description, technical_specs, unit, hsn_code, gst_rate) VALUES
('pr111111-1111-1111-1111-111111111111', 'GT-SOIL-001', 'CBR Testing Machine', 'c1111111-1111-1111-1111-111111111111', 'CBR, soil, california bearing ratio, subgrade, motorized', 'Motorized California Bearing Ratio test apparatus complete with 50 kN load frame.', 'Capacity: 50 kN, Speed: 1.27 mm/min, Motor: 0.5 HP, Voltage: 220V 50Hz single phase, Standards: ASTM D1883, BS 1377', 'Nos', '90318000', 18.00),
('pr222222-2222-2222-2222-222222222222', 'GT-BIT-001', 'Marshall Stability Testing Machine', 'c2222222-2222-2222-2222-222222222222', 'marshall, stability, bitumen, asphalt, flow, 50kn', 'Digital Marshall stability and flow testing machine with electronic load cell and LVDT.', 'Capacity: 50 kN, Platen Rate: 50.8 mm/min, Digital readout for peak load and flow, Standards: ASTM D6927, EN 12697-34', 'Nos', '90318000', 18.00),
('pr333333-3333-3333-3333-333333333333', 'GT-SIEVE-001', 'Test Sieve 200 mm Dia', 'c4444444-4444-4444-4444-444444444444', 'sieve, 200mm, brass, stainless steel, mesh, gradation', 'Precision woven wire test sieve 200 mm diameter with stainless steel mesh.', 'Frame: Seamless spun brass 200 mm dia x 50 mm depth, Mesh: Stainless Steel SS 316, Standards: ISO 3310-1, ASTM E11', 'Nos', '90318000', 18.00),
('pr444444-4444-4444-4444-444444444444', 'GT-CONC-001', 'Compression Testing Machine 2000 kN', 'c3333333-3333-3333-3333-333333333333', 'compression, CTM, concrete cube, 2000kN, 200 ton, hydraulic', 'Digital / Motorized Compression Testing Machine 2000 kN capacity for concrete cubes and cylinders.', 'Capacity: 2000 kN (200 Ton), Platen Size: 300 mm dia, Ram Stroke: 50 mm, Microprocessor digital display, Accuracy: Class 1', 'Nos', '90318000', 18.00)
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO public.product_prices (product_id, price_list_id, price) VALUES
('pr111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 68500.00),
('pr111111-1111-1111-1111-111111111111', 'p2222222-2222-2222-2222-222222222222', 62000.00),
('pr111111-1111-1111-1111-111111111111', 'p3333333-3333-3333-3333-333333333333', 825.00),
('pr111111-1111-1111-1111-111111111111', 'p4444444-4444-4444-4444-444444444444', 760.00),

('pr222222-2222-2222-2222-222222222222', 'p1111111-1111-1111-1111-111111111111', 145000.00),
('pr222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222', 132000.00),
('pr222222-2222-2222-2222-222222222222', 'p3333333-3333-3333-3333-333333333333', 1710.00),
('pr222222-2222-2222-2222-222222222222', 'p4444444-4444-4444-4444-444444444444', 1580.00),

('pr333333-3333-3333-3333-333333333333', 'p1111111-1111-1111-1111-111111111111', 3200.00),
('pr333333-3333-3333-3333-333333333333', 'p2222222-2222-2222-2222-222222222222', 2800.00),
('pr333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333333', 55.00),
('pr333333-3333-3333-3333-333333333333', 'p4444444-4444-4444-4444-444444444444', 50.00),

('pr444444-4444-4444-4444-444444444444', 'p1111111-1111-1111-1111-111111111111', 215000.00),
('pr444444-4444-4444-4444-444444444444', 'p2222222-2222-2222-2222-222222222222', 198000.00),
('pr444444-4444-4444-4444-444444444444', 'p3333333-3333-3333-3333-333333333333', 2700.00),
('pr444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444444', 2490.00)
ON CONFLICT (product_id, price_list_id) DO NOTHING;
;

writeFile('supabase/seed.sql', seedSql);
console.log('Step 1 finished successfully');