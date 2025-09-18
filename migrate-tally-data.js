#!/usr/bin/env node

/**
 * Migrate Tally Data
 * Complete migration of all Tally data to local database
 */

const LocalDatabase = require('./local-database');
const TallyRailwaySync = require('./tally-railway-sync');
const localConfig = require('./local-config.json');
const yaml = require('js-yaml');
const fs = require('fs');

class TallyDataMigrator {
  constructor() {
    this.db = new LocalDatabase(localConfig);
    this.sync = new TallyRailwaySync();
    this.sync.config = localConfig; // Use local config
    
    // Load table definitions
    const tallyConfig = yaml.load(fs.readFileSync('tally-export-config.yaml', 'utf8'));
    this.masterTables = tallyConfig.master || [];
    this.transactionTables = tallyConfig.transaction || [];
  }

  async migrate() {
    console.log('🚀 Starting Complete Tally Data Migration...\n');
    
    try {
      // Step 1: Initialize database
      console.log('1️⃣ Initializing database...');
      await this.db.connect();
      await this.db.createTables();
      console.log('✅ Database initialized\n');
      
      // Step 2: Test Tally connection
      console.log('2️⃣ Testing Tally connection...');
      const testXML = this.sync.createTestTallyXML();
      await this.sync.postTallyXML(testXML);
      console.log('✅ Tally connection successful\n');
      
      // Step 3: Migrate Master Data
      console.log('3️⃣ Migrating Master Data...');
      let masterRecords = 0;
      
      for (const tableConfig of this.masterTables) {
        try {
          const records = await this.migrateTable(tableConfig, 'master');
          masterRecords += records;
          console.log(`   ✅ ${tableConfig.name}: ${records} records`);
        } catch (error) {
          console.log(`   ❌ ${tableConfig.name}: Failed - ${error.message}`);
        }
      }
      
      console.log(`📊 Master Data: ${masterRecords} total records\n`);
      
      // Step 4: Migrate Transaction Data
      console.log('4️⃣ Migrating Transaction Data...');
      let transactionRecords = 0;
      
      for (const tableConfig of this.transactionTables) {
        try {
          const records = await this.migrateTable(tableConfig, 'transaction');
          transactionRecords += records;
          console.log(`   ✅ ${tableConfig.name}: ${records} records`);
        } catch (error) {
          console.log(`   ❌ ${tableConfig.name}: Failed - ${error.message}`);
        }
      }
      
      console.log(`💼 Transaction Data: ${transactionRecords} total records\n`);
      
      // Step 5: Summary
      const totalRecords = masterRecords + transactionRecords;
      console.log('🎉 Migration Completed Successfully!');
      console.log(`📊 Total Records Migrated: ${totalRecords}`);
      console.log(`   • Master Data: ${masterRecords} records`);
      console.log(`   • Transaction Data: ${transactionRecords} records`);
      
      await this.db.close();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.db.close();
      process.exit(1);
    }
  }

  async migrateTable(tableConfig, tableType) {
    // Generate TDL XML
    const xmlRequest = this.sync.generateTDLXML(tableConfig);
    
    // Extract data from Tally
    const xmlResponse = await this.sync.postTallyXML(xmlRequest);
    
    if (!xmlResponse || xmlResponse.trim().length === 0) {
      return 0;
    }
    
    // Process XML to CSV
    const csvData = this.sync.processXMLToCSV(xmlResponse, tableConfig);
    
    // Convert to JSON
    const jsonData = this.sync.csvToJSON(csvData, tableConfig);
    
    if (jsonData.length === 0) {
      return 0;
    }
    
    // Add metadata
    const enrichedData = jsonData.map(record => ({
      ...record,
      company_id: 'SKM',
      division_id: 'MAIN',
      sync_timestamp: new Date().toISOString(),
      source: 'tally'
    }));
    
    // Get table mapping
    const mapping = localConfig.database_mapping[tableConfig.name];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableConfig.name}`);
    }
    
    // Store in database
    const result = await this.db.upsert(mapping.railway_table, enrichedData);
    
    // Update sync metadata
    await this.db.updateSyncMetadata({
      company_id: 'SKM',
      division_id: 'MAIN',
      table_name: tableConfig.name,
      last_sync: new Date().toISOString(),
      sync_type: 'full',
      records_processed: result.processed,
      records_failed: result.errors,
      metadata: { source: 'migration' }
    });
    
    return result.processed;
  }
}

// Run migration
const migrator = new TallyDataMigrator();
migrator.migrate();
