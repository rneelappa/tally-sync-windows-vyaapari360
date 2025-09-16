#!/usr/bin/env node

/**
 * Test Tally Connection at localhost:9000
 * This script tests the connection to Tally XML Server running locally
 */

const axios = require('axios');

const TALLY_URL = 'http://localhost:9000';

// Test XML request for basic Tally connectivity
function createTestXML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Accounts</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

async function testTallyConnection() {
  console.log('🔍 Testing Tally connection at localhost:9000...');
  
  try {
    // Test basic connectivity
    console.log('📡 Sending test request to Tally...');
    
    const response = await axios.post(TALLY_URL, createTestXML(), {
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      },
      timeout: 10000
    });
    
    console.log('✅ Tally connection successful!');
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📏 Response size: ${response.data.length} characters`);
    
    // Check if response contains expected Tally data
    if (response.data.includes('ENVELOPE') && response.data.includes('TALLYMESSAGE')) {
      console.log('✅ Valid Tally XML response received');
      
      // Count accounts if available
      const accountMatches = response.data.match(/<LEDGER>/g);
      const accountCount = accountMatches ? accountMatches.length : 0;
      console.log(`📋 Found ${accountCount} accounts in response`);
      
    } else {
      console.log('⚠️  Response received but may not be valid Tally XML');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Tally connection failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Tally XML Server is not running on localhost:9000');
      console.error('   → Please start Tally and enable XML Server');
      console.error('   → Go to: Help (F1) > Settings > Connectivity > Client/Server configuration');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   → Connection timed out - Tally may be busy or not responding');
    } else {
      console.error(`   → ${error.message}`);
    }
    
    return false;
  }
}

async function testRailwayBackend() {
  console.log('\n🔍 Testing Railway backend connection...');
  
  const RAILWAY_URL = 'https://tally-sync-vyaapari360-production.up.railway.app';
  
  try {
    const response = await axios.get(`${RAILWAY_URL}/api/v1/health`, {
      timeout: 10000
    });
    
    console.log('✅ Railway backend connection successful!');
    console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Railway backend connection failed:');
    console.error(`   → ${error.message}`);
    
    if (error.response) {
      console.error(`   → Status: ${error.response.status}`);
      console.error(`   → Response: ${error.response.data}`);
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Tally Sync Vyaapari360 Connection Test\n');
  
  const tallyConnected = await testTallyConnection();
  const railwayConnected = await testRailwayBackend();
  
  console.log('\n📋 Connection Summary:');
  console.log(`   Tally (localhost:9000): ${tallyConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`   Railway Backend: ${railwayConnected ? '✅ Connected' : '❌ Failed'}`);
  
  if (tallyConnected && railwayConnected) {
    console.log('\n🎉 All connections successful! Ready to sync data.');
    console.log('\n📝 Next steps:');
    console.log('   1. Update Supabase credentials in config.env');
    console.log('   2. Run: node comprehensive-sync.js');
    console.log('   3. Or start the server: node server.js');
  } else {
    console.log('\n⚠️  Some connections failed. Please check the errors above.');
  }
}

// Run the test
main().catch(console.error);
