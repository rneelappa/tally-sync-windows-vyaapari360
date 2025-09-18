const sqlite3 = require('sqlite3').verbose();

console.log('📊 Checking Migration Status...\n');

const db = new sqlite3.Database('./local-database.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    return;
  }
  console.log('✅ Connected to local database\n');
});

// Check tables and their counts
const tables = [
  'groups', 'ledgers', 'stock_items', 'voucher_types', 
  'units', 'godowns', 'vouchers', 'accounting_entries', 'inventory_entries'
];

let totalRecords = 0;
let completedChecks = 0;

console.log('📋 Table Counts:');

tables.forEach(table => {
  db.get(`SELECT COUNT(*) as count FROM ${table} WHERE company_id = ? AND division_id = ?`, 
    ['SKM', 'MAIN'], 
    (err, row) => {
      completedChecks++;
      
      if (err) {
        console.log(`   ❌ ${table}: Error - ${err.message}`);
      } else {
        const count = row.count;
        totalRecords += count;
        if (count > 0) {
          console.log(`   ✅ ${table}: ${count} records`);
        } else {
          console.log(`   ⚪ ${table}: 0 records`);
        }
      }
      
      // If all checks completed, show summary and close
      if (completedChecks === tables.length) {
        console.log(`\n📊 Total Records: ${totalRecords}`);
        
        // Check sync metadata
        db.all(`SELECT * FROM sync_metadata WHERE company_id = ? AND division_id = ? ORDER BY last_sync DESC`, 
          ['SKM', 'MAIN'], 
          (err, rows) => {
            if (!err && rows && rows.length > 0) {
              console.log('\n📋 Recent Syncs:');
              rows.forEach(row => {
                console.log(`   • ${row.table_name}: ${row.records_processed} processed, ${row.records_failed} failed`);
              });
            }
            
            console.log('\n🎯 Migration Status:');
            if (totalRecords > 0) {
              console.log(`   ✅ Migration successful: ${totalRecords} records migrated`);
              console.log('   🎉 Tally data is now in local database!');
            } else {
              console.log('   ⚠️  No data found - run migration: node migrate-tally-data.js');
            }
            
            db.close();
          });
      }
    });
});
