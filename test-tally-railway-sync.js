#!/usr/bin/env node

/**
 * Test script for Tally Railway Sync
 * Tests the complete data flow from Tally to Railway backend
 */

const TallyRailwaySync = require('./tally-railway-sync');

async function testSync() {
  console.log('🧪 Testing Tally Railway Sync...\n');
  
  const sync = new TallyRailwaySync();
  
  try {
    // Test 1: Connection Testing
    console.log('1️⃣ Testing connections...');
    await sync.testConnections();
    console.log('✅ Connection test passed\n');
    
    // Test 2: Sync Metadata
    console.log('2️⃣ Testing sync metadata...');
    await sync.updateSyncMetadata();
    console.log('✅ Sync metadata test passed\n');
    
    // Test 3: Configuration Loading
    console.log('3️⃣ Testing configuration loading...');
    console.log(`📊 Master tables: ${sync.masterTables.length}`);
    console.log(`💼 Transaction tables: ${sync.transactionTables.length}`);
    console.log('✅ Configuration test passed\n');
    
    console.log('🎉 All tests passed! Ready for production sync.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testSync();
