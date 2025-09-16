-- Additional database schema for Tally Database Loader integration
-- This should be added to your Railway/Supabase database

-- Sync metadata table to track sync operations
CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_type VARCHAR(20) DEFAULT 'full', -- 'full' or 'incremental'
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  metadata JSONB, -- Store additional metadata like AlterIDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, division_id, table_name)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_metadata_company_division 
ON sync_metadata(company_id, division_id);

CREATE INDEX IF NOT EXISTS idx_sync_metadata_last_sync 
ON sync_metadata(last_sync DESC);

-- Groups table (master data)
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  parent VARCHAR(500),
  primary_group VARCHAR(500),
  is_revenue BOOLEAN DEFAULT FALSE,
  is_deemedpositive BOOLEAN DEFAULT FALSE,
  is_reserved BOOLEAN DEFAULT FALSE,
  affects_gross_profit BOOLEAN DEFAULT FALSE,
  sort_position INTEGER,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ledgers table (master data)
CREATE TABLE IF NOT EXISTS ledgers (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  parent VARCHAR(500),
  alias VARCHAR(255),
  description VARCHAR(255),
  notes TEXT,
  is_revenue BOOLEAN DEFAULT FALSE,
  is_deemedpositive BOOLEAN DEFAULT FALSE,
  opening_balance DECIMAL(17,2) DEFAULT 0,
  closing_balance DECIMAL(17,2) DEFAULT 0,
  mailing_name VARCHAR(255),
  mailing_address TEXT,
  mailing_state VARCHAR(255),
  mailing_country VARCHAR(255),
  mailing_pincode VARCHAR(64),
  email VARCHAR(255),
  it_pan VARCHAR(64),
  gstn VARCHAR(64),
  gst_registration_type VARCHAR(64),
  gst_supply_type VARCHAR(64),
  gst_duty_head VARCHAR(16),
  tax_rate DECIMAL(9,4) DEFAULT 0,
  bank_account_holder VARCHAR(255),
  bank_account_number VARCHAR(64),
  bank_ifsc VARCHAR(64),
  bank_swift VARCHAR(64),
  bank_name VARCHAR(64),
  bank_branch VARCHAR(64),
  bill_credit_period INTEGER DEFAULT 0,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Items table (master data)
CREATE TABLE IF NOT EXISTS stock_items (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  parent VARCHAR(500),
  alias VARCHAR(255),
  part_number VARCHAR(255),
  description TEXT,
  base_units VARCHAR(255),
  additional_units VARCHAR(255),
  gst_type_of_supply VARCHAR(64),
  gst_hsn_code VARCHAR(64),
  gst_hsn_description TEXT,
  gst_taxability VARCHAR(64),
  opening_balance DECIMAL(17,6) DEFAULT 0,
  opening_rate DECIMAL(17,6) DEFAULT 0,
  opening_value DECIMAL(17,2) DEFAULT 0,
  closing_balance DECIMAL(17,6) DEFAULT 0,
  closing_rate DECIMAL(17,6) DEFAULT 0,
  closing_value DECIMAL(17,2) DEFAULT 0,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voucher Types table (master data)
CREATE TABLE IF NOT EXISTS voucher_types (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent VARCHAR(255),
  numbering_method VARCHAR(64),
  is_deemedpositive BOOLEAN DEFAULT FALSE,
  affects_stock BOOLEAN DEFAULT FALSE,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units table (master data)
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  formal_name VARCHAR(255),
  is_simple_unit BOOLEAN DEFAULT TRUE,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Godowns table (master data)
CREATE TABLE IF NOT EXISTS godowns (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent VARCHAR(255),
  address TEXT,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vouchers table (transaction data)
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  voucher_number VARCHAR(255) NOT NULL,
  voucher_type VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  reference VARCHAR(255),
  reference_date DATE,
  narration TEXT,
  party_ledger_name VARCHAR(500),
  place_of_supply VARCHAR(255),
  amount DECIMAL(17,2) DEFAULT 0,
  is_cancelled BOOLEAN DEFAULT FALSE,
  is_optional BOOLEAN DEFAULT FALSE,
  is_invoice BOOLEAN DEFAULT FALSE,
  is_accounting BOOLEAN DEFAULT TRUE,
  is_inventory BOOLEAN DEFAULT FALSE,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounting Entries table (transaction data)
CREATE TABLE IF NOT EXISTS accounting_entries (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  voucher_guid VARCHAR(100) REFERENCES vouchers(guid),
  ledger_name VARCHAR(500) NOT NULL,
  ledger_guid VARCHAR(100),
  amount DECIMAL(17,2) DEFAULT 0,
  is_party_ledger BOOLEAN DEFAULT FALSE,
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Entries table (transaction data)
CREATE TABLE IF NOT EXISTS inventory_entries (
  id SERIAL PRIMARY KEY,
  guid VARCHAR(100) UNIQUE NOT NULL,
  voucher_guid VARCHAR(100) REFERENCES vouchers(guid),
  stock_item_name VARCHAR(500) NOT NULL,
  stock_item_guid VARCHAR(100),
  quantity DECIMAL(17,6) DEFAULT 0,
  rate DECIMAL(17,6) DEFAULT 0,
  amount DECIMAL(17,2) DEFAULT 0,
  godown VARCHAR(255),
  company_id VARCHAR(100) NOT NULL,
  division_id VARCHAR(100) NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'tally',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_company_division ON groups(company_id, division_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_guid ON groups(guid);

CREATE INDEX IF NOT EXISTS idx_ledgers_company_division ON ledgers(company_id, division_id);
CREATE INDEX IF NOT EXISTS idx_ledgers_name ON ledgers(name);
CREATE INDEX IF NOT EXISTS idx_ledgers_guid ON ledgers(guid);

CREATE INDEX IF NOT EXISTS idx_stock_items_company_division ON stock_items(company_id, division_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_name ON stock_items(name);
CREATE INDEX IF NOT EXISTS idx_stock_items_guid ON stock_items(guid);

CREATE INDEX IF NOT EXISTS idx_vouchers_company_division ON vouchers(company_id, division_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_guid ON vouchers(guid);
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_type ON vouchers(voucher_type);

CREATE INDEX IF NOT EXISTS idx_accounting_entries_voucher_guid ON accounting_entries(voucher_guid);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_ledger_name ON accounting_entries(ledger_name);

CREATE INDEX IF NOT EXISTS idx_inventory_entries_voucher_guid ON inventory_entries(voucher_guid);
CREATE INDEX IF NOT EXISTS idx_inventory_entries_stock_item_name ON inventory_entries(stock_item_name);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_sync_metadata_updated_at BEFORE UPDATE ON sync_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ledgers_updated_at BEFORE UPDATE ON ledgers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voucher_types_updated_at BEFORE UPDATE ON voucher_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_godowns_updated_at BEFORE UPDATE ON godowns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounting_entries_updated_at BEFORE UPDATE ON accounting_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_entries_updated_at BEFORE UPDATE ON inventory_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
