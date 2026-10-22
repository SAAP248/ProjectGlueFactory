/*
# Add sales commission fields to deals

1. Modified Tables
- `deals`
  - `commission_amount` (numeric, default 0) - commission dollar amount entered manually for the deal's salesperson
  - `commission_payroll_date` (date, nullable) - the payroll date the commission is paid on

2. Security
- No policy changes. Existing deal policies and grants already cover these new columns.

3. Notes
1. Additive only; no existing data is changed.
*/

ALTER TABLE deals ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS commission_payroll_date date;