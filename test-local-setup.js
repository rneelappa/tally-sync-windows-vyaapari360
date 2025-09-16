#!/usr/bin/env node

/**
 * Test Local Setup
 * Tests the local database, server, and Tally integration
 */

const LocalDatabase = require('./local-database');
const localConfig = require('./local-config.json');

async function testLocalSetup() {
  console.log('🧪 Testing Local Setup...\n');
  
  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing local database connection...');
    const db = new LocalDatabase(localConfig);
    await db.connect();
    await db.createTables();
    console.log('✅ Local database connection successful\n');
    
    // Test 2: Insert Sample Data
    console.log('2️⃣ Testing database operations...');
    const sampleData = [
      {
        guid: 'test-guid-001',
        name: 'Test Group 1',
        parent: 'Primary',
        primary_group: 'Primary',
        is_revenue: false,
        is_deemedpositive: true,
        is_reserved: false,
        affects_gross_profit: false,
        sort_position: 100,
        company_id: 'SKM',
        division_id: 'MAIN',
        source: 'test'
      }
    ];
    
    const result = await db.upsert('groups', sampleData);
    console.log(`✅ Database operations successful: ${result.processed} processed, ${result.errors} errors\n`);
    
    // Test 3: Metadata Operations
    console.log('3️⃣ Testing sync metadata...');
    const metadata = {
      company_id: 'SKM',
      division_id: 'MAIN',
      table_name: 'groups',
      last_sync: new Date().toISOString(),
      sync_type: 'test',
      records_processed: 1,
      records_failed: 0,
      metadata: { test: true }
    };
    
    await db.updateSyncMetadata(metadata);
    const retrievedMetadata = await db.getMetadata('SKM', 'MAIN');
    console.log(`✅ Metadata operations successful: ${retrievedMetadata.length} records found\n`);
    
    // Test 4: Table Counts
    console.log('4️⃣ Testing table counts...');
    const count = await db.getTableCount('groups', 'SKM', 'MAIN');
    console.log(`✅ Table count successful: ${count} records in groups table\n`);
    
    // Test 5: Tally Connection
    console.log('5️⃣ Testing Tally connection...');
    const TallyRailwaySync = require('./tally-railway-sync');
    const sync = new TallyRailwaySync();
    
    try {
      const testXML = sync.createTestTallyXML();
      await sync.postTallyXML(testXML);
      console.log('✅ Tally connection successful\n');
    } catch (tallyError) {
      console.log('⚠️  Tally connection failed:', tallyError.message);
      console.log('   Make sure Tally is running on localhost:9000 with XML Server enabled\n');
    }
    
    // Cleanup
    await db.close();
    
    console.log('📋 Local Setup Test Summary:');
    console.log('   ✅ SQLite database: Working');
    console.log('   ✅ Database operations: Working');
    console.log('   ✅ Sync metadata: Working');
    console.log('   ✅ Table operations: Working');
    console.log('   ✅ Tally connection: Ready (if Tally is running)');
    console.log();
    console.log('🎯 Next Steps:');
    console.log('   1. Start local server: node local-server.js');
    console.log('   2. Test server endpoints');
    console.log('   3. Run full sync: node local-tally-sync.js');
    console.log('   4. Use batch file: start-local-development.bat');
    
  } catch (error) {
    console.error('❌ Local setup test failed:', error);
    process.exit(1);
  }
}

testLocalSetup();
