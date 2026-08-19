/*
# Expand products table with full Product Central fields

Adds all missing fields to the products table needed for the complete
Product Central product profile.

1. Modified Tables
   - `products` — adds the following new columns:
     - `upc` (text) — Universal Product Code / barcode
     - `raw_cost` (decimal 10,2) — Raw cost before markup
     - `purchase_account` (text) — GL purchase account code
     - `sales_account` (text) — GL sales account code
     - `min_sales_price` (decimal 10,2) — Minimum allowed selling price
     - `subcategory` (text) — Product subcategory
     - `default_system_type` (text) — Default system type for this product
     - `install_hours` (decimal 6,2) — Estimated installation hours
     - `install_information` (text) — Installation notes/instructions
     - `preferred_distributor` (text) — Preferred distributor name
     - `tax_code` (text) — Tax code identifier
     - `product_type` (text) — Type classification (equipment, material, labor, etc.)
     - `is_taxable` (boolean, default true) — Whether product is taxable

2. Important Notes
   - All columns are nullable to avoid breaking existing data.
   - Existing `manufacturer` column serves as "Brand" (display label change only).
   - Existing `description` column serves as "Short Description".
   - Existing `long_description` column serves as detailed description.
   - Existing `cost` column is the standard cost; `raw_cost` is a separate raw/landed cost.
   - Existing `price` column is the sales price; `min_sales_price` is the floor.
   - Existing `chart_of_accounts` remains; `purchase_account` and `sales_account` are more specific.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='upc') THEN
    ALTER TABLE products ADD COLUMN upc text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='raw_cost') THEN
    ALTER TABLE products ADD COLUMN raw_cost decimal(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='purchase_account') THEN
    ALTER TABLE products ADD COLUMN purchase_account text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='sales_account') THEN
    ALTER TABLE products ADD COLUMN sales_account text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='min_sales_price') THEN
    ALTER TABLE products ADD COLUMN min_sales_price decimal(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='subcategory') THEN
    ALTER TABLE products ADD COLUMN subcategory text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='default_system_type') THEN
    ALTER TABLE products ADD COLUMN default_system_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='install_hours') THEN
    ALTER TABLE products ADD COLUMN install_hours decimal(6,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='install_information') THEN
    ALTER TABLE products ADD COLUMN install_information text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='preferred_distributor') THEN
    ALTER TABLE products ADD COLUMN preferred_distributor text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='tax_code') THEN
    ALTER TABLE products ADD COLUMN tax_code text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='product_type') THEN
    ALTER TABLE products ADD COLUMN product_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_taxable') THEN
    ALTER TABLE products ADD COLUMN is_taxable boolean DEFAULT true;
  END IF;
END $$;
