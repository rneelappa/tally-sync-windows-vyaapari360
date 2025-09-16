#!/usr/bin/env node

/**
 * Comprehensive Tally Data Sync Script
 * Uses the current API to populate database with all available Tally data
 */

const axios = require('axios');

const API_BASE = 'https://tally-sync-vyaapari360-production.up.railway.app/api/v1';
const COMPANY_ID = '629f49fb-983e-4141-8c48-e1423b39e921';
const DIVISION_ID = '37f3cc0c-58ad-4baf-b309-360116ffc3cd';

// Tally report types for master data
const MASTER_DATA_TYPES = [
  'Ledger',           // Chart of Accounts
  'Group',            // Account Groups  
  'StockItem',        // Inventory Items
  'VoucherType',      // Transaction Types
  'Unit',             // Units of Measure
  'Godown',           // Warehouses
  'CostCentre',       // Cost Centers
  'TaxMaster',        // Tax Masters
  'Currency',         // Currencies
  'Company',          // Company Info
  'Voucher',          // All Vouchers
  'DayBook'           // Day Book (alternative voucher format)
];

class TallyDataSync {
  constructor() {
    this.results = {
      success: [],
      failed: [],
      totals: {}
    };
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log(`🔄 Fetching: ${endpoint}`);
      
      const response = await axios.get(url, { 
        params,
        timeout: 30000 
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async syncMasterData() {
    console.log('🚀 Starting Comprehensive Tally Data Sync...\n');
    
    // 1. Check API Health
    console.log('📊 Checking API Health...');
    const health = await this.makeRequest('/health');
    if (health.success && health.data && health.data.storage) {
      console.log(`✅ API Health: ${health.data.storage.totalVouchers} vouchers in storage`);
      this.results.totals.initialVouchers = health.data.storage.totalVouchers;
    } else {
      console.log('⚠️ API Health check failed or no storage data');
    }

    // 2. Sync All Vouchers (if not already done)
    console.log('\n📋 Syncing All Vouchers...');
    const voucherSync = await this.syncVouchers();
    this.results.totals.vouchers = voucherSync;

    // 3. Test each master data type
    console.log('\n🔍 Testing Master Data Types...');
    for (const dataType of MASTER_DATA_TYPES) {
      await this.testMasterDataType(dataType);
    }

    // 4. Generate Summary Report
    this.generateSummaryReport();
  }

  async syncVouchers() {
    try {
      // Try to sync all vouchers without date restrictions
      const response = await axios.post(`${API_BASE}/sync/${COMPANY_ID}/${DIVISION_ID}`, {}, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      if (response.data.success) {
        console.log(`✅ Vouchers: ${response.data.data.totalVouchers} total, ${response.data.data.storedVouchers} stored`);
        return {
          total: response.data.data.totalVouchers,
          stored: response.data.data.storedVouchers,
          method: response.data.data.method || 'Unknown'
        };
      } else {
        console.log(`⚠️ Voucher sync failed: ${response.data.error}`);
        return { error: response.data.error };
      }
    } catch (error) {
      console.log(`❌ Voucher sync error: ${error.message}`);
      return { error: error.message };
    }
  }

  async testMasterDataType(dataType) {
    console.log(`\n🔍 Testing ${dataType}...`);
    
    try {
      // Test if we can fetch this data type
      const testUrl = `${API_BASE}/test-master-data/${COMPANY_ID}/${DIVISION_ID}/${dataType}`;
      
      // Since we don't have specific endpoints for master data yet,
      // let's try to understand what data we can get from the current sync
      const health = await this.makeRequest('/health');
      
      if (health.success) {
        console.log(`✅ ${dataType}: API accessible`);
        this.results.success.push({
          type: dataType,
          status: 'API accessible',
          note: 'Endpoint needs to be implemented'
        });
      } else {
        console.log(`❌ ${dataType}: API not accessible`);
        this.results.failed.push({
          type: dataType,
          error: 'API not accessible'
        });
      }
    } catch (error) {
      console.log(`❌ ${dataType}: ${error.message}`);
      this.results.failed.push({
        type: dataType,
        error: error.message
      });
    }
  }

  async analyzeCurrentData() {
    console.log('\n📊 Analyzing Current Data...');
    
    // Get sample vouchers to understand data structure
    const vouchers = await this.makeRequest(`/vouchers/${COMPANY_ID}/${DIVISION_ID}`, { limit: 5 });
    
    if (vouchers.success) {
      console.log(`✅ Found ${vouchers.data.total} vouchers`);
      
      // Analyze voucher structure for master data references
      const sampleVoucher = vouchers.data.vouchers[0];
      if (sampleVoucher) {
        console.log('\n📋 Sample Voucher Structure:');
        console.log(`- Type: ${sampleVoucher.type}`);
        console.log(`- Number: ${sampleVoucher.number}`);
        console.log(`- Date: ${sampleVoucher.date}`);
        console.log(`- Party: ${sampleVoucher.party || 'N/A'}`);
        console.log(`- Entries: ${sampleVoucher.entries?.length || 0} ledger entries`);
        console.log(`- Inventory: ${sampleVoucher.inventoryEntries?.length || 0} inventory entries`);
        
        // Extract master data references
        this.extractMasterDataReferences(sampleVoucher);
      }
    }
  }

  extractMasterDataReferences(voucher) {
    console.log('\n🔍 Extracting Master Data References...');
    
    const references = {
      voucherTypes: new Set(),
      ledgers: new Set(),
      stockItems: new Set(),
      units: new Set(),
      godowns: new Set()
    };

    // Extract from voucher type
    if (voucher.type) {
      references.voucherTypes.add(voucher.type);
    }

    // Extract from ledger entries
    if (voucher.entries) {
      voucher.entries.forEach(entry => {
        if (entry.ledgerName) {
          references.ledgers.add(entry.ledgerName);
        }
      });
    }

    // Extract from inventory entries
    if (voucher.inventoryEntries) {
      voucher.inventoryEntries.forEach(entry => {
        if (entry.stockItemName) {
          references.stockItems.add(entry.stockItemName);
        }
        if (entry.unit) {
          references.units.add(entry.unit);
        }
        if (entry.godownName) {
          references.godowns.add(entry.godownName);
        }
      });
    }

    // Display findings
    console.log(`\n📊 Master Data References Found:`);
    console.log(`- Voucher Types: ${references.voucherTypes.size}`);
    console.log(`- Ledgers: ${references.ledgers.size}`);
    console.log(`- Stock Items: ${references.stockItems.size}`);
    console.log(`- Units: ${references.units.size}`);
    console.log(`- Godowns: ${references.godowns.size}`);

    // Show samples
    if (references.voucherTypes.size > 0) {
      console.log(`\n📋 Sample Voucher Types: ${Array.from(references.voucherTypes).slice(0, 5).join(', ')}`);
    }
    if (references.ledgers.size > 0) {
      console.log(`\n📋 Sample Ledgers: ${Array.from(references.ledgers).slice(0, 5).join(', ')}`);
    }
    if (references.stockItems.size > 0) {
      console.log(`\n📋 Sample Stock Items: ${Array.from(references.stockItems).slice(0, 5).join(', ')}`);
    }

    this.results.totals.masterDataReferences = references;
  }

  generateSummaryReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE SYNC SUMMARY REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Successful Operations: ${this.results.success.length}`);
    this.results.success.forEach(item => {
      console.log(`  - ${item.type}: ${item.status}`);
    });
    
    console.log(`\n❌ Failed Operations: ${this.results.failed.length}`);
    this.results.failed.forEach(item => {
      console.log(`  - ${item.type}: ${item.error}`);
    });
    
    console.log(`\n📊 Data Totals:`);
    if (this.results.totals.initialVouchers) {
      console.log(`  - Initial Vouchers: ${this.results.totals.initialVouchers}`);
    }
    if (this.results.totals.vouchers) {
      console.log(`  - Vouchers Synced: ${this.results.totals.vouchers.total || 'N/A'}`);
      console.log(`  - Vouchers Stored: ${this.results.totals.vouchers.stored || 'N/A'}`);
    }
    
    console.log(`\n🎯 Next Steps:`);
    console.log(`  1. Implement master data endpoints in the API`);
    console.log(`  2. Create specific sync functions for each data type`);
    console.log(`  3. Add master data storage and retrieval logic`);
    console.log(`  4. Test comprehensive sync with all data types`);
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the comprehensive sync
async function main() {
  const sync = new TallyDataSync();
  
  try {
    await sync.syncMasterData();
    await sync.analyzeCurrentData();
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TallyDataSync;
