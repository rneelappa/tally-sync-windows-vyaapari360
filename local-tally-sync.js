#!/usr/bin/env node

/**
 * Local Tally to Database Sync
 * Uses local SQLite database instead of Railway backend
 */

const TallyRailwaySync = require('./tally-railway-sync');
const localConfig = require('./local-config.json');

class LocalTallySync extends TallyRailwaySync {
  constructor() {
    // Use local configuration instead of railway config
    super();
    this.config = localConfig;
  }

  /**
   * Override the sync method to use local configuration
   */
  async sync() {
    console.log('🏠 Starting Local Tally to Database Sync...');
    console.log(`📊 Mode: ${this.config.sync.mode}`);
    console.log(`🎯 Target: ${this.config.railway.api_base} (Local SQLite)`);
    
    try {
      // Test connections first
      await this.testConnections();
      
      // Get sync metadata from local database
      await this.updateSyncMetadata();
      
      if (this.config.sync.mode === 'incremental') {
        await this.performIncrementalSync();
      } else {
        await this.performFullSync();
      }
      
      console.log('✅ Local sync completed successfully!');
      
    } catch (error) {
      console.error('❌ Local sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Test connections to both Tally and local server
   */
  async testConnections() {
    console.log('🔍 Testing local connections...');
    
    // Test Tally connection
    try {
      const testXML = this.createTestTallyXML();
      await this.postTallyXML(testXML);
      console.log('✅ Tally connection successful (localhost:9000)');
    } catch (error) {
      throw new Error(`Tally connection failed: ${error.message}`);
    }
    
    // Test local server connection
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.config.railway.api_base}${this.config.railway.endpoints.health}`);
      console.log('✅ Local server connection successful (localhost:3000)');
    } catch (error) {
      throw new Error(`Local server connection failed: ${error.message}. Make sure to run: node local-server.js`);
    }
  }
}

// Main execution
async function main() {
  console.log('🏠 Local Tally Sync - Development Mode');
  console.log('=====================================\n');
  
  const sync = new LocalTallySync();
  
  try {
    await sync.sync();
    
    // Show summary statistics
    console.log('\n📊 Sync Summary:');
    const axios = require('axios');
    const statsResponse = await axios.get(`${localConfig.railway.api_base}/api/v1/stats/${localConfig.railway.company_id}/${localConfig.railway.division_id}`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data;
      console.log(`   📋 Total Records: ${stats.total_records}`);
      Object.entries(stats.table_counts).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`   • ${table}: ${count} records`);
        }
      });
    }
    
    console.log('\n🎉 Local development sync completed successfully!');
    console.log('\n🔧 Next steps:');
    console.log('   • View data in SQLite database: local-database.db');
    console.log('   • Check sync status: http://localhost:3000/api/v1/sync-status/SKM/MAIN');
    console.log('   • When ready, deploy to Railway with the same code');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Local sync process failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Make sure Tally is running on localhost:9000');
    console.error('   • Make sure local server is running: node local-server.js');
    console.error('   • Check that Tally XML Server is enabled');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = LocalTallySync;
