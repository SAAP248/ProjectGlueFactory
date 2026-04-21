/*
  # Update Deal Stages and Add Install Status

  ## Changes
  
  1. Updates
    - Update deals table to include sales_stage, install_status, and office_status
    - Add assigned_sales_person for tracking salesperson performance
    - Add close_date for tracking when deals were won
    - Add lost_reason for tracking why deals were lost
    
  2. New Columns
    - `sales_stage` - Current sales stage (Lead, Proposal Sent, etc.)
    - `install_status` - Installation progress status
    - `office_status` - Office processing status
    - `assigned_sales_person` - Reference to employee who owns the deal
    - `close_date` - Date when deal was closed (won or lost)
    - `lost_reason` - Reason if deal was lost
    - `proposal_sent_date` - When proposal was sent
    - `proposal_viewed_date` - When customer viewed proposal
    
  ## Sales Stages
  - Lead
  - Proposal Sent
  - Proposal Viewed
  - Proposal Accepted
  - Agreement Sent
  - Sold
  - Sold & Failed
  - Did not sell
  - Purchased From Another
  - Lost
  
  ## Install Statuses
  - Not Scheduled
  - Waiting on Customer
  - Scheduled
  - In Progress
  - On hold
  - Completed
  - Sent to Office Review
  
  ## Office Statuses
  - Sold
  - Contract Signed
  - Invoices Paid
  - Subscription Created
  - Office Reviewed
  - Customer Cancelled
*/

-- Add new columns to deals table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'sales_stage'
  ) THEN
    ALTER TABLE deals ADD COLUMN sales_stage text NOT NULL DEFAULT 'Lead';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'install_status'
  ) THEN
    ALTER TABLE deals ADD COLUMN install_status text DEFAULT 'Not Scheduled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'office_status'
  ) THEN
    ALTER TABLE deals ADD COLUMN office_status text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'assigned_sales_person'
  ) THEN
    ALTER TABLE deals ADD COLUMN assigned_sales_person uuid REFERENCES employees(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'close_date'
  ) THEN
    ALTER TABLE deals ADD COLUMN close_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE deals ADD COLUMN lost_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'proposal_sent_date'
  ) THEN
    ALTER TABLE deals ADD COLUMN proposal_sent_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'proposal_viewed_date'
  ) THEN
    ALTER TABLE deals ADD COLUMN proposal_viewed_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'agreement_sent_date'
  ) THEN
    ALTER TABLE deals ADD COLUMN agreement_sent_date date;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_deals_sales_stage ON deals(sales_stage);
CREATE INDEX IF NOT EXISTS idx_deals_install_status ON deals(install_status);
CREATE INDEX IF NOT EXISTS idx_deals_office_status ON deals(office_status);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_sales_person ON deals(assigned_sales_person);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(close_date);