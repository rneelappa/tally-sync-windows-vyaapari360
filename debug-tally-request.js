#!/usr/bin/env node

/**
 * Debug Tally Request Script
 * Test the exact XML request being sent to Tally
 */

const axios = require('axios');

async function debugTallyRequest() {
  console.log('🔍 Debugging Tally Request...\n');
  
  // Test the TallySync endpoint with debug info
  try {
    console.log('📤 Sending request to TallySync...');
    
    const response = await axios.post(
      'https://tally-sync-vyaapari360-production.up.railway.app/api/v1/tallysync/sync/629f49fb-983e-4141-8c48-e1423b39e921/37f3cc0c-58ad-4baf-b309-360116ffc3cd',
      {},
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('📥 Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Also test a simple request to see if we can reach Tally at all
async function testBasicTallyConnection() {
  console.log('\n🔗 Testing basic Tally connection...');
  
  // Simple XML request that should work with any Tally installation
  const basicXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Company</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    // We'd need the actual Tally URL to test this
    console.log('📤 Basic XML request structure:');
    console.log(basicXml);
    console.log('\n⚠️ Cannot test direct connection without Tally URL from Supabase');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

async function main() {
  await debugTallyRequest();
  await testBasicTallyConnection();
}

main().catch(console.error);
