#!/usr/bin/env node

/**
 * Test Data Extraction from Tally
 * This script tests the TDL XML generation and data extraction without Railway backend
 */

const TallyRailwaySync = require('./tally-railway-sync');

async function testDataExtraction() {
  console.log('🧪 Testing Data Extraction from Tally...\n');
  
  const sync = new TallyRailwaySync();
  
  try {
    // Test connection to Tally
    console.log('1️⃣ Testing Tally connection...');
    const testXML = sync.createTestTallyXML();
    await sync.postTallyXML(testXML);
    console.log('✅ Tally connection successful\n');
    
    // Test data extraction for Groups (smallest table)
    console.log('2️⃣ Testing Groups data extraction...');
    const groupTable = sync.masterTables.find(t => t.name === 'mst_group');
    
    if (groupTable) {
      console.log(`📋 Table: ${groupTable.name}`);
      console.log(`📊 Collection: ${groupTable.collection}`);
      console.log(`🔧 Fields: ${groupTable.fields.length} fields\n`);
      
      // Generate TDL XML
      console.log('🔄 Generating TDL XML...');
      const xmlRequest = sync.generateTDLXML(groupTable);
      console.log(`📏 XML size: ${xmlRequest.length} characters\n`);
      
      // Extract data from Tally
      console.log('📡 Extracting data from Tally...');
      const xmlResponse = await sync.postTallyXML(xmlRequest);
      console.log(`📏 Response size: ${xmlResponse.length} characters\n`);
      
      // Process XML to CSV
      console.log('🔄 Processing XML to CSV...');
      const csvData = sync.processXMLToCSV(xmlResponse, groupTable);
      const csvLines = csvData.split('\n').filter(line => line.trim());
      console.log(`📊 CSV lines: ${csvLines.length} (including header)\n`);
      
      // Convert to JSON
      console.log('🔄 Converting CSV to JSON...');
      const jsonData = sync.csvToJSON(csvData, groupTable);
      console.log(`📊 JSON records: ${jsonData.length}\n`);
      
      // Show sample data
      if (jsonData.length > 0) {
        console.log('📋 Sample Records:');
        jsonData.slice(0, 5).forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.name} (${record.guid})`);
        });
        console.log(`   ... and ${jsonData.length - 5} more records\n`);
        
        // Show field mapping
        console.log('🗂️  Field Mapping:');
        Object.keys(jsonData[0]).forEach(field => {
          const value = jsonData[0][field];
          console.log(`   ${field}: ${typeof value} = "${value}"`);
        });
      }
      
      console.log('\n✅ Data extraction test completed successfully!');
      console.log(`\n📈 Summary:`);
      console.log(`   • Connected to Tally at localhost:9000`);
      console.log(`   • Generated TDL XML (${xmlRequest.length} chars)`);
      console.log(`   • Extracted XML response (${xmlResponse.length} chars)`);
      console.log(`   • Processed ${jsonData.length} records`);
      console.log(`   • Ready to push to Railway backend`);
      
    } else {
      console.log('❌ Groups table not found in configuration');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testDataExtraction();
