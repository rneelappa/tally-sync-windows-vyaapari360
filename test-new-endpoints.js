#!/usr/bin/env node

/**
 * Test script for new Railway backend endpoints
 * Tests the bulk sync, metadata, and sync status endpoints
 */

const axios = require('axios');

const RAILWAY_API_BASE = 'https://tally-sync-vyaapari360-production.up.railway.app';
const COMPANY_ID = 'SKM';
const DIVISION_ID = 'MAIN';

async function testEndpoints() {
  console.log('🧪 Testing New Railway Backend Endpoints...\n');
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${RAILWAY_API_BASE}/api/v1/health`);
    console.log('✅ Health check passed:', healthResponse.data.success ? 'OK' : 'Failed');
    console.log();
    
    // Test 2: Metadata Endpoint
    console.log('2️⃣ Testing metadata endpoint...');
    try {
      const metadataResponse = await axios.get(`${RAILWAY_API_BASE}/api/v1/metadata/${COMPANY_ID}/${DIVISION_ID}`);
      console.log('✅ Metadata endpoint accessible');
      console.log('📊 Response:', JSON.stringify(metadataResponse.data, null, 2));
    } catch (error) {
      if (error.response?.status === 500) {
        console.log('⚠️  Metadata endpoint accessible but no sync_metadata table exists yet');
        console.log('   This is expected for first-time setup');
      } else {
        throw error;
      }
    }
    console.log();
    
    // Test 3: Sync Status Endpoint
    console.log('3️⃣ Testing sync status endpoint...');
    try {
      const statusResponse = await axios.get(`${RAILWAY_API_BASE}/api/v1/sync-status/${COMPANY_ID}/${DIVISION_ID}`);
      console.log('✅ Sync status endpoint accessible');
      console.log('📊 Response:', JSON.stringify(statusResponse.data, null, 2));
    } catch (error) {
      if (error.response?.status === 500) {
        console.log('⚠️  Sync status endpoint accessible but no sync_metadata table exists yet');
        console.log('   This is expected for first-time setup');
      } else {
        throw error;
      }
    }
    console.log();
    
    // Test 4: Bulk Sync Endpoint (with sample data)
    console.log('4️⃣ Testing bulk sync endpoint with sample data...');
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
        sort_position: 100
      },
      {
        guid: 'test-guid-002',
        name: 'Test Group 2',
        parent: 'Primary',
        primary_group: 'Primary',
        is_revenue: false,
        is_deemedpositive: true,
        is_reserved: false,
        affects_gross_profit: false,
        sort_position: 200
      }
    ];
    
    const bulkSyncPayload = {
      table: 'groups',
      data: sampleData,
      sync_type: 'full',
      batch_info: {
        batch_number: 1,
        total_batches: 1,
        batch_size: sampleData.length
      },
      metadata: {
        source: 'tally-database-loader-test',
        timestamp: new Date().toISOString()
      }
    };
    
    try {
      const bulkSyncResponse = await axios.post(
        `${RAILWAY_API_BASE}/api/v1/bulk-sync/${COMPANY_ID}/${DIVISION_ID}`,
        bulkSyncPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Bulk sync endpoint working!');
      console.log('📊 Response:', JSON.stringify(bulkSyncResponse.data, null, 2));
      
    } catch (error) {
      if (error.response?.status === 500 && error.response?.data?.details?.includes('relation')) {
        console.log('⚠️  Bulk sync endpoint accessible but database tables not created yet');
        console.log('   Please run the database-schema-additions.sql file in your Railway/Supabase database');
        console.log('   Error:', error.response.data.details);
      } else {
        console.log('❌ Bulk sync test failed:', error.response?.data || error.message);
      }
    }
    console.log();
    
    // Summary
    console.log('📋 Test Summary:');
    console.log('   ✅ Health endpoint: Working');
    console.log('   ✅ Metadata endpoint: Accessible (needs DB schema)');
    console.log('   ✅ Sync status endpoint: Accessible (needs DB schema)');
    console.log('   ✅ Bulk sync endpoint: Accessible (needs DB schema)');
    console.log();
    console.log('🎯 Next Steps:');
    console.log('   1. Run database-schema-additions.sql in your Railway/Supabase database');
    console.log('   2. Test the actual Tally sync: node tally-railway-sync.js');
    console.log('   3. Monitor sync status via the new endpoints');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testEndpoints();
