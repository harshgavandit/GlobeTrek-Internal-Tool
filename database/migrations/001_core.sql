CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, full_name text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','team_member')), password_hash text NOT NULL,
 is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users(lower(email));
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE login_attempts (key text PRIMARY KEY, attempts integer NOT NULL, window_start timestamptz NOT NULL);
CREATE TABLE categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX categories_name_key ON categories(lower(name));
CREATE TABLE price_lists (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, currency text NOT NULL CHECK (currency IN ('INR','USD','EUR','GBP','AED')), description text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX price_lists_name_key ON price_lists(lower(name));
CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text NOT NULL, name text NOT NULL, category_id uuid REFERENCES categories(id), data jsonb NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX products_sku_key ON products(lower(sku));
CREATE INDEX products_category ON products(category_id);
CREATE TABLE product_prices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id), price_list_id uuid NOT NULL REFERENCES price_lists(id), unit_price numeric(16,2) NOT NULL CHECK(unit_price >= 0), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(product_id,price_list_id));
CREATE TABLE product_price_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id), price_list_id uuid NOT NULL REFERENCES price_lists(id), old_price numeric(16,2), new_price numeric(16,2) NOT NULL CHECK(new_price>=0), changed_by_user_id uuid NOT NULL REFERENCES users(id), change_reason text NOT NULL, changed_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX price_history_product ON product_price_history(product_id,changed_at DESC);
CREATE TABLE customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE company_settings (id text PRIMARY KEY CHECK(id='company'), data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1);
CREATE TABLE quotation_sequences (financial_year text PRIMARY KEY, sequence_number integer NOT NULL CHECK(sequence_number>0));
CREATE TABLE quotations (
 id uuid PRIMARY KEY, quotation_number text NOT NULL UNIQUE, financial_year text NOT NULL, sequence_number integer NOT NULL,
 customer_id uuid NOT NULL REFERENCES customers(id), price_list_id uuid NOT NULL REFERENCES price_lists(id),
 created_by_user_id uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 1, status text NOT NULL CHECK(status IN ('draft','sent','accepted','rejected')),
 subtotal numeric(16,2) NOT NULL CHECK(subtotal>=0), total_amount numeric(16,2) NOT NULL CHECK(total_amount>=0),
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, UNIQUE(financial_year,sequence_number), UNIQUE(created_by_user_id,request_id)
);
CREATE TABLE quotation_items (
 id uuid PRIMARY KEY, quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id), position integer NOT NULL,
 master_price numeric(16,2) NOT NULL CHECK(master_price>=0), unit_price numeric(16,2) NOT NULL CHECK(unit_price>=0),
 quantity numeric(12,3) NOT NULL CHECK(quantity>0), discount_percent numeric(5,2) NOT NULL CHECK(discount_percent BETWEEN 0 AND 100),
 line_total numeric(16,2) NOT NULL CHECK(line_total>=0), snapshot jsonb NOT NULL, UNIQUE(quotation_id,position)
);
CREATE INDEX quotation_items_quote ON quotation_items(quotation_id);
CREATE TABLE quotation_revisions (quotation_id uuid NOT NULL REFERENCES quotations(id), revision integer NOT NULL, snapshot jsonb NOT NULL, changed_by_user_id uuid NOT NULL REFERENCES users(id), changed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(quotation_id,revision));
CREATE TABLE import_previews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), payload jsonb NOT NULL, baseline text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes', committed_at timestamptz);
