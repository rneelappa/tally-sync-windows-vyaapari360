#!/usr/bin/env node

/**
 * Database Population Script
 * Uses current API to populate database with complete Tally data
 */

const axios = require('axios');

const API_BASE = 'https://tally-sync-vyaapari360-production.up.railway.app/api/v1';
const COMPANY_ID = '629f49fb-983e-4141-8c48-e1423b39e921';
const DIVISION_ID = '37f3cc0c-58ad-4baf-b309-360116ffc3cd';

class DatabasePopulator {
  constructor() {
    this.results = {
      vouchers: { total: 0, detailed: 0, errors: 0 },
      masterData: { extracted: 0, unique: 0 },
      errors: []
    };
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const url = `${API_BASE}${endpoint}`;
      const response = await axios.get(url, { 
        params,
        timeout: 30000 
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error: ${endpoint}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async populateDatabase() {
    console.log('🚀 Starting Database Population...\n');
    
    // Step 1: Clear existing data and re-sync with detailed information
    console.log('📋 Step 1: Re-syncing with detailed voucher data...');
    await this.syncDetailedVouchers();
    
    // Step 2: Extract master data from vouchers
    console.log('\n📊 Step 2: Extracting master data from vouchers...');
    await this.extractMasterData();
    
    // Step 3: Generate summary
    console.log('\n📈 Step 3: Generating summary...');
    this.generateSummary();
  }

  async syncDetailedVouchers() {
    try {
      console.log('🔄 Triggering detailed voucher sync...');
      
      // Try to sync with a broad date range to get all vouchers with details
      const response = await axios.post(`${API_BASE}/sync/${COMPANY_ID}/${DIVISION_ID}`, {
        fromDate: '20200101',
        toDate: '20251231'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 // 2 minutes timeout
      });

      if (response.data.success) {
        console.log(`✅ Sync completed: ${response.data.data.totalVouchers} vouchers`);
        this.results.vouchers.total = response.data.data.totalVouchers;
        this.results.vouchers.detailed = response.data.data.storedVouchers;
      } else {
        console.log(`⚠️ Sync failed: ${response.data.error}`);
        this.results.errors.push(`Sync failed: ${response.data.error}`);
      }
    } catch (error) {
      console.log(`❌ Sync error: ${error.message}`);
      this.results.errors.push(`Sync error: ${error.message}`);
    }
  }

  async extractMasterData() {
    console.log('🔍 Extracting master data from voucher entries...');
    
    const masterData = {
      voucherTypes: new Set(),
      ledgers: new Set(),
      stockItems: new Set(),
      units: new Set(),
      godowns: new Set(),
      parties: new Set()
    };

    try {
      // Get all vouchers in batches to extract master data
      let page = 1;
      let hasMore = true;
      let processedVouchers = 0;

      while (hasMore && processedVouchers < 1000) { // Limit to prevent timeout
        console.log(`📄 Processing page ${page}...`);
        
        const response = await this.makeRequest(`/vouchers/${COMPANY_ID}/${DIVISION_ID}`, {
          page: page,
          limit: 50
        });

        if (!response.success || !response.data.vouchers) {
          console.log('⚠️ No more vouchers or error occurred');
          break;
        }

        const vouchers = response.data.vouchers;
        if (vouchers.length === 0) {
          hasMore = false;
          break;
        }

        // Process each voucher
        vouchers.forEach(voucher => {
          this.extractVoucherMasterData(voucher, masterData);
          processedVouchers++;
        });

        // Check if there are more pages
        if (response.data.pages && page >= response.data.pages) {
          hasMore = false;
        } else {
          page++;
        }

        // Add delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Processed ${processedVouchers} vouchers`);
      
      // Store results
      this.results.masterData.extracted = processedVouchers;
      this.results.masterData.unique = {
        voucherTypes: masterData.voucherTypes.size,
        ledgers: masterData.ledgers.size,
        stockItems: masterData.stockItems.size,
        units: masterData.units.size,
        godowns: masterData.godowns.size,
        parties: masterData.parties.size
      };

      // Display findings
      this.displayMasterData(masterData);

    } catch (error) {
      console.log(`❌ Master data extraction error: ${error.message}`);
      this.results.errors.push(`Master data extraction: ${error.message}`);
    }
  }

  extractVoucherMasterData(voucher, masterData) {
    // Extract voucher type
    if (voucher.type) {
      masterData.voucherTypes.add(voucher.type);
    }
    if (voucher.voucherTypeName) {
      masterData.voucherTypes.add(voucher.voucherTypeName);
    }

    // Extract party information
    if (voucher.partyLedgerName) {
      masterData.parties.add(voucher.partyLedgerName);
    }

    // Extract from ledger entries
    if (voucher.entries && Array.isArray(voucher.entries)) {
      voucher.entries.forEach(entry => {
        if (entry.ledgerName) {
          masterData.ledgers.add(entry.ledgerName);
        }
      });
    }

    // Extract from inventory entries
    if (voucher.inventoryEntries && Array.isArray(voucher.inventoryEntries)) {
      voucher.inventoryEntries.forEach(entry => {
        if (entry.stockItemName) {
          masterData.stockItems.add(entry.stockItemName);
        }
        if (entry.unit) {
          masterData.units.add(entry.unit);
        }
        if (entry.godownName) {
          masterData.godowns.add(entry.godownName);
        }
      });
    }
  }

  displayMasterData(masterData) {
    console.log('\n📊 Master Data Extracted:');
    console.log(`- Voucher Types: ${masterData.voucherTypes.size}`);
    console.log(`- Ledgers: ${masterData.ledgers.size}`);
    console.log(`- Stock Items: ${masterData.stockItems.size}`);
    console.log(`- Units: ${masterData.units.size}`);
    console.log(`- Godowns: ${masterData.godowns.size}`);
    console.log(`- Parties: ${masterData.parties.size}`);

    // Show samples
    if (masterData.voucherTypes.size > 0) {
      const types = Array.from(masterData.voucherTypes).slice(0, 10);
      console.log(`\n📋 Sample Voucher Types: ${types.join(', ')}`);
    }

    if (masterData.ledgers.size > 0) {
      const ledgers = Array.from(masterData.ledgers).slice(0, 10);
      console.log(`\n📋 Sample Ledgers: ${ledgers.join(', ')}`);
    }

    if (masterData.parties.size > 0) {
      const parties = Array.from(masterData.parties).slice(0, 10);
      console.log(`\n📋 Sample Parties: ${parties.join(', ')}`);
    }
  }

  generateSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE POPULATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📋 Voucher Data:`);
    console.log(`  - Total Vouchers: ${this.results.vouchers.total}`);
    console.log(`  - Detailed Vouchers: ${this.results.vouchers.detailed}`);
    console.log(`  - Errors: ${this.results.vouchers.errors}`);
    
    console.log(`\n📊 Master Data Extracted:`);
    if (this.results.masterData.unique) {
      console.log(`  - Voucher Types: ${this.results.masterData.unique.voucherTypes}`);
      console.log(`  - Ledgers: ${this.results.masterData.unique.ledgers}`);
      console.log(`  - Stock Items: ${this.results.masterData.unique.stockItems}`);
      console.log(`  - Units: ${this.results.masterData.unique.units}`);
      console.log(`  - Godowns: ${this.results.masterData.unique.godowns}`);
      console.log(`  - Parties: ${this.results.masterData.unique.parties}`);
    }
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    console.log(`\n🎯 Database Status:`);
    if (this.results.vouchers.total > 0) {
      console.log(`  ✅ Database populated with ${this.results.vouchers.total} vouchers`);
      if (this.results.masterData.unique && this.results.masterData.unique.ledgers > 0) {
        console.log(`  ✅ Master data extracted successfully`);
      } else {
        console.log(`  ⚠️ Master data extraction needs improvement`);
      }
    } else {
      console.log(`  ❌ Database population failed`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the database population
async function main() {
  const populator = new DatabasePopulator();
  
  try {
    await populator.populateDatabase();
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabasePopulator;
