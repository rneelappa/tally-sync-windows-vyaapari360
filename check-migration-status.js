#!/usr/bin/env node

/**
 * Check Migration Status
 * Shows what data has been migrated to the local database
 */

const LocalDatabase = require('./local-database');
const localConfig = require('./local-config.json');

async function checkMigrationStatus() {
  console.log('📊 Checking Migration Status...\n');
  
  const db = new LocalDatabase(localConfig);
  
  try {
    await db.connect();
    
    // Check each table
    const tables = [
      'groups', 'ledgers', 'stock_items', 'voucher_types', 
      'units', 'godowns', 'vouchers', 'accounting_entries', 'inventory_entries'
    ];
    
    const companyId = 'SKM';
    const divisionId = 'MAIN';
    
    console.log('📋 Table Counts:');
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const count = await db.getTableCount(table, companyId, divisionId);
        if (count > 0) {
          console.log(`   ✅ ${table}: ${count} records`);
          totalRecords += count;
        } else {
          console.log(`   ⚪ ${table}: 0 records`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Total Records: ${totalRecords}`);
    
    // Check sync metadata
    console.log('\n📋 Sync History:');
    const metadata = await db.getMetadata(companyId, divisionId);
    
    if (metadata && metadata.length > 0) {
      metadata.forEach(item => {
        console.log(`   • ${item.table_name}: ${item.records_processed} processed, ${item.records_failed} failed (${item.last_sync})`);
      });
    } else {
      console.log('   No sync history found');
    }
    
    await db.close();
    
    console.log('\n🎯 Migration Summary:');
    if (totalRecords > 0) {
      console.log(`   ✅ Successfully migrated ${totalRecords} records`);
      console.log('   🎉 Migration is working!');
    } else {
      console.log('   ⚠️  No data found - migration may need to be run');
    }
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  }
}

checkMigrationStatus();
