const axios = require('axios');

// Railway API configuration
const RAILWAY_API_BASE = 'https://tally-sync-vyaapari360-production.up.railway.app';
const COMPANY_ID = '629f49fb-983e-4141-8c48-e1423b39e921';
const DIVISION_ID = '37f3cc0c-58ad-4baf-b309-360116ffc3cd';

async function fixRailwaySchema() {
  console.log('🔧 Fixing Railway database schema...');
  
  try {
    // Check if Railway is accessible
    console.log('🔍 Checking Railway API health...');
    const healthResponse = await axios.get(`${RAILWAY_API_BASE}/api/v1/health`, {
      timeout: 10000
    });
    
    if (healthResponse.data.success) {
      console.log('✅ Railway API is accessible');
    } else {
      throw new Error('Railway API health check failed');
    }
    
    // Add missing columns to stock_items table
    console.log('🔧 Adding missing columns to stock_items table...');
    
    const alterTableQueries = [
      // Add missing columns to stock_items table
      "ALTER TABLE stock_items ADD COLUMN notes TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN part_number TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN alternate_uom TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN conversion INTEGER DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN opening_balance REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN opening_rate REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN opening_value REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN closing_balance REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN closing_rate REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN closing_value REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN costing_method TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN gst_type_of_supply TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN gst_hsn_code TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN gst_hsn_description TEXT DEFAULT ''",
      "ALTER TABLE stock_items ADD COLUMN gst_rate REAL DEFAULT 0",
      "ALTER TABLE stock_items ADD COLUMN gst_taxability TEXT DEFAULT ''",
      
      // Add missing columns to other tables that might be missing them
      "ALTER TABLE ledgers ADD COLUMN notes TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN alias TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN description TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN is_revenue INTEGER DEFAULT 0",
      "ALTER TABLE ledgers ADD COLUMN is_deemedpositive INTEGER DEFAULT 0",
      "ALTER TABLE ledgers ADD COLUMN opening_balance REAL DEFAULT 0",
      "ALTER TABLE ledgers ADD COLUMN closing_balance REAL DEFAULT 0",
      "ALTER TABLE ledgers ADD COLUMN mailing_name TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN mailing_address TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN mailing_state TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN mailing_country TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN mailing_pincode TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN email TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN it_pan TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN gstn TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN gst_registration_type TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN gst_supply_type TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN gst_duty_head TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN tax_rate REAL DEFAULT 0",
      "ALTER TABLE ledgers ADD COLUMN bank_account_holder TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN bank_account_number TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN bank_ifsc TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN bank_swift TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN bank_name TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN bank_branch TEXT DEFAULT ''",
      "ALTER TABLE ledgers ADD COLUMN bill_credit_period INTEGER DEFAULT 0",
      
      // Add missing columns to units table
      "ALTER TABLE units ADD COLUMN formalname TEXT DEFAULT ''",
      "ALTER TABLE units ADD COLUMN is_simple_unit INTEGER DEFAULT 0",
      "ALTER TABLE units ADD COLUMN base_units TEXT DEFAULT ''",
      "ALTER TABLE units ADD COLUMN additional_units TEXT DEFAULT ''",
      "ALTER TABLE units ADD COLUMN conversion INTEGER DEFAULT 0",
      
      // Add missing columns to groups table
      "ALTER TABLE groups ADD COLUMN primary_group TEXT DEFAULT ''",
      "ALTER TABLE groups ADD COLUMN is_revenue INTEGER DEFAULT 0",
      "ALTER TABLE groups ADD COLUMN is_deemedpositive INTEGER DEFAULT 0",
      "ALTER TABLE groups ADD COLUMN is_reserved INTEGER DEFAULT 0",
      "ALTER TABLE groups ADD COLUMN affects_gross_profit INTEGER DEFAULT 0",
      "ALTER TABLE groups ADD COLUMN sort_position INTEGER DEFAULT 0",
      
      // Add missing columns to voucher_types table
      "ALTER TABLE voucher_types ADD COLUMN numbering_method TEXT DEFAULT ''",
      "ALTER TABLE voucher_types ADD COLUMN is_deemedpositive INTEGER DEFAULT 0",
      "ALTER TABLE voucher_types ADD COLUMN affects_stock INTEGER DEFAULT 0",
      
      // Add missing columns to godowns table
      "ALTER TABLE godowns ADD COLUMN address TEXT DEFAULT ''",
      
      // Add missing columns to vouchers table
      "ALTER TABLE vouchers ADD COLUMN amount REAL DEFAULT 0",
      "ALTER TABLE vouchers ADD COLUMN total_amount REAL DEFAULT 0",
      "ALTER TABLE vouchers ADD COLUMN basic_amount REAL DEFAULT 0",
      "ALTER TABLE vouchers ADD COLUMN net_amount REAL DEFAULT 0",
      "ALTER TABLE vouchers ADD COLUMN final_amount REAL DEFAULT 0",
      "ALTER TABLE vouchers ADD COLUMN party_name TEXT DEFAULT ''",
      "ALTER TABLE vouchers ADD COLUMN narration TEXT DEFAULT ''",
      "ALTER TABLE vouchers ADD COLUMN voucher_type TEXT DEFAULT ''",
      "ALTER TABLE vouchers ADD COLUMN voucher_date TEXT DEFAULT ''",
      
      // Add missing columns to accounting_entries table
      "ALTER TABLE accounting_entries ADD COLUMN voucher_guid TEXT DEFAULT ''",
      "ALTER TABLE accounting_entries ADD COLUMN voucher_number TEXT DEFAULT ''",
      "ALTER TABLE accounting_entries ADD COLUMN voucher_type TEXT DEFAULT ''",
      "ALTER TABLE accounting_entries ADD COLUMN voucher_date TEXT DEFAULT ''",
      "ALTER TABLE accounting_entries ADD COLUMN ledger_name TEXT DEFAULT ''",
      "ALTER TABLE accounting_entries ADD COLUMN amount REAL DEFAULT 0",
      "ALTER TABLE accounting_entries ADD COLUMN is_deemed_positive INTEGER DEFAULT 0",
      
      // Add missing columns to inventory_entries table
      "ALTER TABLE inventory_entries ADD COLUMN voucher_guid TEXT DEFAULT ''",
      "ALTER TABLE inventory_entries ADD COLUMN voucher_number TEXT DEFAULT ''",
      "ALTER TABLE inventory_entries ADD COLUMN voucher_type TEXT DEFAULT ''",
      "ALTER TABLE inventory_entries ADD COLUMN voucher_date TEXT DEFAULT ''",
      "ALTER TABLE inventory_entries ADD COLUMN stock_item_name TEXT DEFAULT ''",
      "ALTER TABLE inventory_entries ADD COLUMN quantity REAL DEFAULT 0",
      "ALTER TABLE inventory_entries ADD COLUMN rate REAL DEFAULT 0",
      "ALTER TABLE inventory_entries ADD COLUMN amount REAL DEFAULT 0",
      "ALTER TABLE inventory_entries ADD COLUMN godown_name TEXT DEFAULT ''",
      "ALTER TABLE inventory_entries ADD COLUMN order_duedate TEXT DEFAULT ''"
    ];
    
    // Execute each ALTER TABLE query
    for (let i = 0; i < alterTableQueries.length; i++) {
      const query = alterTableQueries[i];
      console.log(`🔧 Executing query ${i + 1}/${alterTableQueries.length}: ${query.substring(0, 50)}...`);
      
      try {
        const response = await axios.post(
          `${RAILWAY_API_BASE}/api/v1/query/${COMPANY_ID}/${DIVISION_ID}`,
          {
            query: query,
            table: 'schema_fix'
          },
          {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          console.log(`✅ Query ${i + 1} executed successfully`);
        } else {
          console.log(`⚠️ Query ${i + 1} result: ${response.data.error || 'Unknown error'}`);
        }
      } catch (error) {
        if (error.response && error.response.data && error.response.data.error && 
            error.response.data.error.includes('duplicate column name')) {
          console.log(`ℹ️ Query ${i + 1}: Column already exists (skipping)`);
        } else {
          console.log(`❌ Query ${i + 1} failed: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Schema fix completed!');
    
    // Verify the fix by checking stock_items table structure
    console.log('🔍 Verifying stock_items table structure...');
    try {
      const verifyResponse = await axios.post(
        `${RAILWAY_API_BASE}/api/v1/query/${COMPANY_ID}/${DIVISION_ID}`,
        {
          query: "PRAGMA table_info(stock_items)",
          table: 'schema_verify'
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (verifyResponse.data.success) {
        console.log('✅ Stock_items table structure verified');
        console.log('📋 Columns in stock_items table:');
        verifyResponse.data.data.forEach(column => {
          console.log(`  - ${column.name} (${column.type})`);
        });
      }
    } catch (error) {
      console.log(`⚠️ Could not verify table structure: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the schema fix
fixRailwaySchema().then(() => {
  console.log('🎉 Schema fix process completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Schema fix process failed:', error);
  process.exit(1);
});
