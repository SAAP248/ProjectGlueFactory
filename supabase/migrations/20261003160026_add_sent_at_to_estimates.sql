/*
# Track when an estimate was sent to the customer

1. Modified Tables
- `estimates`
  - `sent_at` (timestamptz, nullable): when staff last sent the estimate/proposal link to the customer.
2. Security
- No policy changes; existing estimates policies apply.
*/

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS sent_at timestamptz;