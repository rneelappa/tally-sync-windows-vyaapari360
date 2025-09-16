const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class LocalDatabase {
  constructor(config) {
    this.config = config;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const dbPath = this.config.database.filename;
      
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir) && dbDir !== '.') {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database:', dbPath);
          resolve();
        }
      });

      // Enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON');
    });
  }

  async createTables() {
    const schema = `
      -- Sync metadata table
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_type TEXT DEFAULT 'full',
        records_processed INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        metadata TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, division_id, table_name)
      );

      -- Groups table (master data)
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent TEXT,
        primary_group TEXT,
        is_revenue BOOLEAN DEFAULT 0,
        is_deemedpositive BOOLEAN DEFAULT 0,
        is_reserved BOOLEAN DEFAULT 0,
        affects_gross_profit BOOLEAN DEFAULT 0,
        sort_position INTEGER,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Ledgers table (master data)
      CREATE TABLE IF NOT EXISTS ledgers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent TEXT,
        alias TEXT,
        description TEXT,
        notes TEXT,
        is_revenue BOOLEAN DEFAULT 0,
        is_deemedpositive BOOLEAN DEFAULT 0,
        opening_balance DECIMAL(17,2) DEFAULT 0,
        closing_balance DECIMAL(17,2) DEFAULT 0,
        mailing_name TEXT,
        mailing_address TEXT,
        mailing_state TEXT,
        mailing_country TEXT,
        mailing_pincode TEXT,
        email TEXT,
        it_pan TEXT,
        gstn TEXT,
        gst_registration_type TEXT,
        gst_supply_type TEXT,
        gst_duty_head TEXT,
        tax_rate DECIMAL(9,4) DEFAULT 0,
        bank_account_holder TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        bank_swift TEXT,
        bank_name TEXT,
        bank_branch TEXT,
        bill_credit_period INTEGER DEFAULT 0,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Stock Items table (master data)
      CREATE TABLE IF NOT EXISTS stock_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent TEXT,
        alias TEXT,
        part_number TEXT,
        description TEXT,
        base_units TEXT,
        additional_units TEXT,
        gst_type_of_supply TEXT,
        gst_hsn_code TEXT,
        gst_hsn_description TEXT,
        gst_taxability TEXT,
        opening_balance DECIMAL(17,6) DEFAULT 0,
        opening_rate DECIMAL(17,6) DEFAULT 0,
        opening_value DECIMAL(17,2) DEFAULT 0,
        closing_balance DECIMAL(17,6) DEFAULT 0,
        closing_rate DECIMAL(17,6) DEFAULT 0,
        closing_value DECIMAL(17,2) DEFAULT 0,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Voucher Types table (master data)
      CREATE TABLE IF NOT EXISTS voucher_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent TEXT,
        numbering_method TEXT,
        is_deemedpositive BOOLEAN DEFAULT 0,
        affects_stock BOOLEAN DEFAULT 0,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Units table (master data)
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        formal_name TEXT,
        is_simple_unit BOOLEAN DEFAULT 1,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Godowns table (master data)
      CREATE TABLE IF NOT EXISTS godowns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent TEXT,
        address TEXT,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Vouchers table (transaction data)
      CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        voucher_number TEXT NOT NULL,
        voucher_type TEXT NOT NULL,
        date DATE NOT NULL,
        reference TEXT,
        reference_date DATE,
        narration TEXT,
        party_ledger_name TEXT,
        place_of_supply TEXT,
        amount DECIMAL(17,2) DEFAULT 0,
        is_cancelled BOOLEAN DEFAULT 0,
        is_optional BOOLEAN DEFAULT 0,
        is_invoice BOOLEAN DEFAULT 0,
        is_accounting BOOLEAN DEFAULT 1,
        is_inventory BOOLEAN DEFAULT 0,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Accounting Entries table (transaction data)
      CREATE TABLE IF NOT EXISTS accounting_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        voucher_guid TEXT,
        ledger_name TEXT NOT NULL,
        ledger_guid TEXT,
        amount DECIMAL(17,2) DEFAULT 0,
        is_party_ledger BOOLEAN DEFAULT 0,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Inventory Entries table (transaction data)
      CREATE TABLE IF NOT EXISTS inventory_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        voucher_guid TEXT,
        stock_item_name TEXT NOT NULL,
        stock_item_guid TEXT,
        quantity DECIMAL(17,6) DEFAULT 0,
        rate DECIMAL(17,6) DEFAULT 0,
        amount DECIMAL(17,2) DEFAULT 0,
        godown TEXT,
        company_id TEXT NOT NULL,
        division_id TEXT NOT NULL,
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT DEFAULT 'tally',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_groups_company_division ON groups(company_id, division_id);
      CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
      CREATE INDEX IF NOT EXISTS idx_ledgers_company_division ON ledgers(company_id, division_id);
      CREATE INDEX IF NOT EXISTS idx_ledgers_name ON ledgers(name);
      CREATE INDEX IF NOT EXISTS idx_vouchers_company_division ON vouchers(company_id, division_id);
      CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err.message);
          reject(err);
        } else {
          console.log('✅ Database tables created successfully');
          resolve();
        }
      });
    });
  }

  async upsert(tableName, data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return new Promise((resolve, reject) => {
      const db = this.db; // Capture db reference
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let processed = 0;
        let errors = 0;
        let completed = 0;
        
        data.forEach((record, index) => {
          const columns = Object.keys(record);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(col => record[col]);
          
          // SQLite UPSERT syntax
          const sql = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT(guid) DO UPDATE SET
            ${columns.filter(col => col !== 'guid').map(col => `${col} = excluded.${col}`).join(', ')},
            updated_at = CURRENT_TIMESTAMP
          `;
          
          db.run(sql, values, function(err) {
            if (err) {
              console.error(`❌ Error inserting record ${index + 1}:`, err.message);
              errors++;
            } else {
              processed++;
            }
            
            completed++;
            
            // Check if this is the last record
            if (completed === data.length) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  console.error('❌ Transaction commit error:', commitErr.message);
                  reject(commitErr);
                } else {
                  resolve({ processed, errors });
                }
              });
            }
          });
        });
      });
    });
  }

  async getMetadata(companyId, divisionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM sync_metadata 
        WHERE company_id = ? AND division_id = ?
        ORDER BY last_sync DESC
      `;
      
      this.db.all(sql, [companyId, divisionId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse JSON metadata
          const metadata = rows.map(row => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
          }));
          resolve(metadata);
        }
      });
    });
  }

  async updateSyncMetadata(metadata) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO sync_metadata (
          company_id, division_id, table_name, last_sync, sync_type,
          records_processed, records_failed, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(company_id, division_id, table_name) DO UPDATE SET
          last_sync = excluded.last_sync,
          sync_type = excluded.sync_type,
          records_processed = excluded.records_processed,
          records_failed = excluded.records_failed,
          metadata = excluded.metadata,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      const values = [
        metadata.company_id,
        metadata.division_id,
        metadata.table_name,
        metadata.last_sync,
        metadata.sync_type,
        metadata.records_processed,
        metadata.records_failed,
        JSON.stringify(metadata.metadata || {})
      ];
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async getTableCount(tableName, companyId, divisionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as count FROM ${tableName}
        WHERE company_id = ? AND division_id = ?
      `;
      
      this.db.get(sql, [companyId, divisionId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('✅ Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = LocalDatabase;
