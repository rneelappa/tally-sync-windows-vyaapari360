#!/usr/bin/env node

/**
 * Tally to Railway Backend Sync
 * Uses exact logic from tally-database-loader to extract data from Tally
 * and push it to Railway backend database
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const axios = require('axios');
const yaml = require('js-yaml');

// Load configurations
const railwayConfig = JSON.parse(fs.readFileSync('./railway-sync-config.json', 'utf8'));
const tallyExportConfig = yaml.load(fs.readFileSync('./tally-export-config.yaml', 'utf8'));

class TallyRailwaySync {
  constructor() {
    this.config = railwayConfig;
    this.masterTables = tallyExportConfig.master || [];
    this.transactionTables = tallyExportConfig.transaction || [];
    this.lastAlterIdMaster = 0;
    this.lastAlterIdTransaction = 0;
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.config.sync.temp_directory)) {
      fs.mkdirSync(this.config.sync.temp_directory, { recursive: true });
    }
  }

  /**
   * Main sync function - orchestrates the entire sync process
   */
  async sync() {
    console.log('🚀 Starting Tally to Railway Backend Sync...');
    console.log(`📊 Mode: ${this.config.sync.mode}`);
    console.log(`🎯 Target: ${this.config.railway.api_base}`);
    
    try {
      // Test connections first
      await this.testConnections();
      
      // Get sync metadata from Railway
      await this.updateSyncMetadata();
      
      if (this.config.sync.mode === 'incremental') {
        await this.performIncrementalSync();
      } else {
        await this.performFullSync();
      }
      
      console.log('✅ Sync completed successfully!');
      
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Test connections to both Tally and Railway backend
   */
  async testConnections() {
    console.log('🔍 Testing connections...');
    
    // Test Tally connection
    try {
      const testXML = this.createTestTallyXML();
      await this.postTallyXML(testXML);
      console.log('✅ Tally connection successful');
    } catch (error) {
      throw new Error(`Tally connection failed: ${error.message}`);
    }
    
    // Test Railway backend connection
    try {
      const response = await axios.get(`${this.config.railway.api_base}${this.config.railway.endpoints.health}`);
      console.log('✅ Railway backend connection successful');
    } catch (error) {
      throw new Error(`Railway backend connection failed: ${error.message}`);
    }
  }

  /**
   * Generate TDL XML request (exact logic from tally-database-loader)
   */
  generateTDLXML(tableConfig, incremental = false) {
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>TallyDatabaseLoaderReport</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>XML (Data Interchange)</SVEXPORTFORMAT>
        <SVFROMDATE>${this.config.tally.fromdate}</SVFROMDATE>
        <SVTODATE>${this.config.tally.todate}</SVTODATE>`;
    
    if (this.config.tally.company) {
      xml += `<SVCURRENTCOMPANY>${this.escapeHTML(this.config.tally.company)}</SVCURRENTCOMPANY>`;
    }
    
    xml += `</STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="TallyDatabaseLoaderReport">
            <FORMS>MyForm</FORMS>
          </REPORT>
          <FORM NAME="MyForm">
            <PARTS>MyPart01</PARTS>
          </FORM>`;

    // Handle collection routes (e.g., Group.Ledger)
    const collectionRoutes = tableConfig.collection.split('.');
    const targetCollection = collectionRoutes[0];
    const routes = ['MyCollection', ...collectionRoutes.slice(1)];

    // Generate PART XML for each route level
    for (let i = 0; i < routes.length; i++) {
      const partName = `MyPart${String(i + 1).padStart(2, '0')}`;
      const lineName = `MyLine${String(i + 1).padStart(2, '0')}`;
      xml += `<PART NAME="${partName}">
            <LINES>${lineName}</LINES>
            <REPEAT>${lineName} : ${routes[i]}</REPEAT>
            <SCROLLED>Vertical</SCROLLED>
          </PART>`;
    }

    // Generate LINE XML (except last line which contains field data)
    for (let i = 0; i < routes.length - 1; i++) {
      const lineName = `MyLine${String(i + 1).padStart(2, '0')}`;
      const nextPartName = `MyPart${String(i + 2).padStart(2, '0')}`;
      xml += `<LINE NAME="${lineName}">
            <FIELDS>FldBlank</FIELDS>
            <EXPLODE>${nextPartName}</EXPLODE>
          </LINE>`;
    }

    // Last line with actual fields
    const lastLineName = `MyLine${String(routes.length).padStart(2, '0')}`;
    xml += `<LINE NAME="${lastLineName}">
            <FIELDS>`;
    
    // Add field declarations
    for (let i = 0; i < tableConfig.fields.length; i++) {
      xml += `Fld${String(i + 1).padStart(2, '0')},`;
    }
    xml = xml.slice(0, -1); // Remove last comma
    
    xml += `</FIELDS>
          </LINE>`;
    
    // Add field definitions
    for (let i = 0; i < tableConfig.fields.length; i++) {
      const field = tableConfig.fields[i];
      xml += `<FIELD NAME="Fld${String(i + 1).padStart(2, '0')}">`;
      
      // Generate field expression based on type (exact tally-database-loader logic)
      if (/^(\.\.)?[a-zA-Z0-9_]+$/g.test(field.field)) {
        if (field.type === 'text') {
          xml += `<SET>$${field.field}</SET>`;
        } else if (field.type === 'logical') {
          xml += `<SET>if $${field.field} then 1 else 0</SET>`;
        } else if (field.type === 'date') {
          xml += `<SET>if $$IsEmpty:$${field.field} then $$StrByCharCode:241 else $$PyrlYYYYMMDDFormat:$${field.field}:"-"</SET>`;
        } else if (field.type === 'number') {
          xml += `<SET>if $$IsEmpty:$${field.field} then "0" else $$String:$${field.field}</SET>`;
        } else if (field.type === 'amount') {
          xml += `<SET>$$StringFindAndReplace:(if $$IsDebit:$${field.field} then -$$NumValue:$${field.field} else $$NumValue:$${field.field}):"(-)":"-"</SET>`;
        } else if (field.type === 'quantity') {
          xml += `<SET>$$StringFindAndReplace:(if $$IsInwards:$${field.field} then $$Number:$$String:$${field.field}:"TailUnits" else -$$Number:$$String:$${field.field}:"TailUnits"):"(-)":"-"</SET>`;
        } else if (field.type === 'rate') {
          xml += `<SET>if $$IsEmpty:$${field.field} then 0 else $$Number:$${field.field}</SET>`;
        } else {
          xml += `<SET>${field.field}</SET>`;
        }
      } else {
        xml += `<SET>${field.field}</SET>`;
      }
      
      xml += `<XMLTAG>F${String(i + 1).padStart(2, '0')}</XMLTAG>`;
      xml += `</FIELD>`;
    }
    
    xml += `<FIELD NAME="FldBlank"><SET>""</SET></FIELD>`;

    // Collection definition
    xml += `<COLLECTION NAME="MyCollection">
            <TYPE>${targetCollection}</TYPE>`;
    
    // Add fetch list
    if (tableConfig.fetch && tableConfig.fetch.length) {
      xml += `<FETCH>${tableConfig.fetch.join(',')}</FETCH>`;
    }
    
    // Add filters for incremental sync
    if (tableConfig.filters && tableConfig.filters.length) {
      xml += `<FILTER>`;
      tableConfig.filters.forEach((filter, index) => {
        xml += `Fltr${String(index + 1).padStart(2, '0')},`;
      });
      xml = xml.slice(0, -1); // Remove last comma
      xml += `</FILTER>`;
    }
    
    xml += `</COLLECTION>`;
    
    // Add filter definitions
    if (tableConfig.filters && tableConfig.filters.length) {
      tableConfig.filters.forEach((filter, index) => {
        xml += `<SYSTEM TYPE="Formulae" NAME="Fltr${String(index + 1).padStart(2, '0')}">${filter}</SYSTEM>`;
      });
    }
    
    xml += `</TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    
    return xml;
  }

  /**
   * Create test XML for connection testing
   */
  createTestTallyXML() {
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

  /**
   * Send XML request to Tally (exact logic from tally-database-loader)
   */
  postTallyXML(xmlRequest) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: this.config.tally.server,
        port: this.config.tally.port,
        path: '',
        method: 'POST',
        headers: {
          'Content-Length': Buffer.byteLength(xmlRequest, 'utf16le'),
          'Content-Type': 'text/xml;charset=utf-16'
        }
      }, (res) => {
        let data = '';
        res.setEncoding('utf16le')
          .on('data', (chunk) => {
            data += chunk.toString();
          })
          .on('end', () => {
            resolve(data);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(xmlRequest, 'utf16le');
      req.end();
    });
  }

  /**
   * Update sync metadata from Railway backend
   */
  async updateSyncMetadata() {
    try {
      const response = await axios.get(
        `${this.config.railway.api_base}${this.config.railway.endpoints.metadata}/${this.config.railway.company_id}/${this.config.railway.division_id}`
      );
      
      const metadata = response.data;
      this.lastAlterIdMaster = metadata.last_alter_id_master || 0;
      this.lastAlterIdTransaction = metadata.last_alter_id_transaction || 0;
      
      console.log(`📋 Last AlterID - Master: ${this.lastAlterIdMaster}, Transaction: ${this.lastAlterIdTransaction}`);
    } catch (error) {
      console.log('⚠️  Could not fetch sync metadata, starting fresh sync');
      this.lastAlterIdMaster = 0;
      this.lastAlterIdTransaction = 0;
    }
  }

  /**
   * Perform full sync of all data
   */
  async performFullSync() {
    console.log('📊 Performing full sync...');
    
    // Sync master data first (in priority order)
    const masterTables = [...this.masterTables].sort((a, b) => {
      const priorityA = this.config.database_mapping[a.name]?.sync_priority || 999;
      const priorityB = this.config.database_mapping[b.name]?.sync_priority || 999;
      return priorityA - priorityB;
    });
    
    for (const table of masterTables) {
      await this.syncTable(table, 'master');
    }
    
    // Sync transaction data
    for (const table of this.transactionTables) {
      await this.syncTable(table, 'transaction');
    }
  }

  /**
   * Sync a single table from Tally to Railway
   */
  async syncTable(tableConfig, tableType, incremental = false) {
    const tableName = tableConfig.name;
    console.log(`🔄 Syncing ${tableName}...`);
    
    try {
      // Step 1: Generate TDL XML for this table
      const xmlRequest = this.generateTDLXML(tableConfig, incremental);
      
      // Step 2: Extract data from Tally
      console.log(`  📡 Extracting data from Tally...`);
      const xmlResponse = await this.postTallyXML(xmlRequest);
      
      if (!xmlResponse || xmlResponse.trim().length === 0) {
        console.log(`  ℹ️  No data returned from Tally for ${tableName}`);
        return;
      }
      
      // Step 3: Process XML to CSV format
      console.log(`  🔄 Processing XML response...`);
      const csvData = this.processXMLToCSV(xmlResponse, tableConfig);
      
      // Step 4: Convert CSV to JSON
      const jsonData = this.csvToJSON(csvData, tableConfig);
      
      if (jsonData.length === 0) {
        console.log(`  ℹ️  No records found for ${tableName}`);
        return;
      }
      
      console.log(`  📊 Processed ${jsonData.length} records`);
      
      // Step 5: Map to Railway schema
      const mappedData = this.mapToRailwaySchema(jsonData, tableName);
      
      // Step 6: Submit to Railway backend
      console.log(`  🚀 Submitting to Railway backend...`);
      const result = await this.submitToRailway(mappedData, incremental);
      
      console.log(`✅ ${tableName}: synced ${jsonData.length} records successfully`);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to sync ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Process XML response to CSV format (exact logic from tally-database-loader)
   */
  processXMLToCSV(xmlData, tableConfig) {
    let processed = xmlData;
    
    // Remove XML envelope and clean up (exact tally-database-loader logic)
    processed = processed.replace('<ENVELOPE>', '');
    processed = processed.replace('</ENVELOPE>', '');
    processed = processed.replace(/\<FLDBLANK\>\<\/FLDBLANK\>/g, '');
    processed = processed.replace(/\s+\r\n/g, '');
    processed = processed.replace(/\r\n/g, '');
    processed = processed.replace(/\t/g, ' ');
    processed = processed.replace(/\s+\<F/g, '<F');
    processed = processed.replace(/\<\/F\d+\>/g, '');
    processed = processed.replace(/\<F01\>/g, '\r\n');
    processed = processed.replace(/\<F\d+\>/g, '\t');
    
    // Escape HTML entities
    processed = processed.replace(/&amp;/g, '&');
    processed = processed.replace(/&lt;/g, '<');
    processed = processed.replace(/&gt;/g, '>');
    processed = processed.replace(/&quot;/g, '"');
    processed = processed.replace(/&apos;/g, "'");
    processed = processed.replace(/&tab;/g, '');
    processed = processed.replace(/&#\d+;/g, "");
    
    // Add column headers
    const headers = tableConfig.fields.map(f => f.name).join('\t');
    return headers + processed;
  }

  /**
   * Convert CSV to JSON array
   */
  csvToJSON(csvData, tableConfig) {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return [];
    
    const headers = lines[0].split('\t');
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const record = {};
      
      headers.forEach((header, index) => {
        const fieldConfig = tableConfig.fields.find(f => f.name === header);
        record[header] = this.transformValue(values[index] || '', fieldConfig?.type || 'text');
      });
      
      // Only add records with valid GUID
      if (record.guid && record.guid.trim()) {
        records.push(record);
      }
    }
    
    return records;
  }

  /**
   * Transform value based on field type
   */
  transformValue(value, type) {
    if (!value || value.trim() === '' || value === '±') return null;
    
    const trimmedValue = value.trim();
    
    switch (type) {
      case 'logical':
        return trimmedValue === '1' || trimmedValue.toLowerCase() === 'true';
      case 'number':
      case 'amount':
      case 'quantity':
      case 'rate':
        const numValue = parseFloat(trimmedValue);
        return isNaN(numValue) ? 0 : numValue;
      case 'date':
        // Handle Tally date format
        if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return trimmedValue;
        }
        return null;
      default:
        return trimmedValue;
    }
  }

  /**
   * Map Tally data to Railway backend schema
   */
  mapToRailwaySchema(tallyData, tableName) {
    const mapping = this.config.database_mapping[tableName];
    if (!mapping) {
      throw new Error(`No mapping found for table: ${tableName}`);
    }
    
    return {
      table: mapping.railway_table,
      data: tallyData.map(record => ({
        ...record,
        company_id: this.config.railway.company_id,
        division_id: this.config.railway.division_id,
        sync_timestamp: new Date().toISOString(),
        source: 'tally'
      }))
    };
  }

  /**
   * Submit data to Railway backend
   */
  async submitToRailway(mappedData, incremental = false) {
    const endpoint = `${this.config.railway.api_base}${this.config.railway.endpoints.bulk_sync}/${this.config.railway.company_id}/${this.config.railway.division_id}`;
    
    // Split data into batches for large datasets
    const batchSize = this.config.railway.batch_size;
    const batches = [];
    
    for (let i = 0; i < mappedData.data.length; i += batchSize) {
      batches.push(mappedData.data.slice(i, i + batchSize));
    }
    
    console.log(`    📦 Submitting ${batches.length} batch(es) of data...`);
    
    let totalProcessed = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const payload = {
        table: mappedData.table,
        data: batch,
        sync_type: incremental ? 'incremental' : 'full',
        batch_info: {
          batch_number: i + 1,
          total_batches: batches.length,
          batch_size: batch.length
        },
        metadata: {
          source: 'tally-database-loader',
          timestamp: new Date().toISOString(),
          record_count: batch.length,
          table_name: mappedData.table
        }
      };
      
      try {
        const response = await axios.post(endpoint, payload, {
          timeout: this.config.railway.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        totalProcessed += batch.length;
        console.log(`    ✅ Batch ${i + 1}/${batches.length}: ${batch.length} records processed`);
        
      } catch (error) {
        console.error(`    ❌ Batch ${i + 1}/${batches.length} failed:`, error.response?.data || error.message);
        
        // Retry logic for failed batches
        if (error.response?.status >= 500) {
          console.log(`    🔄 Retrying batch ${i + 1}...`);
          await this.delay(2000); // Wait 2 seconds
          
          try {
            const retryResponse = await axios.post(endpoint, payload, {
              timeout: this.config.railway.timeout,
              headers: {
                'Content-Type': 'application/json'
              }
            });
            totalProcessed += batch.length;
            console.log(`    ✅ Batch ${i + 1}/${batches.length}: ${batch.length} records processed (retry)`);
          } catch (retryError) {
            console.error(`    ❌ Batch ${i + 1}/${batches.length} failed on retry:`, retryError.response?.data || retryError.message);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    }
    
    return {
      success: true,
      total_processed: totalProcessed,
      total_batches: batches.length
    };
  }

  /**
   * Perform incremental sync of changed data only
   */
  async performIncrementalSync() {
    console.log('🔄 Performing incremental sync...');
    
    // Get current AlterIDs from Tally
    await this.updateTallyAlterIds();
    
    const masterChanged = this.lastAlterIdMaster > 0;
    const transactionChanged = this.lastAlterIdTransaction > 0;
    
    if (!masterChanged && !transactionChanged) {
      console.log('ℹ️  No changes detected in Tally data');
      return;
    }
    
    if (masterChanged) {
      console.log('📊 Syncing changed master data...');
      for (const table of this.masterTables) {
        // Add AlterID filter for incremental sync
        const modifiedTable = { ...table };
        if (!modifiedTable.filters) modifiedTable.filters = [];
        modifiedTable.filters.push(`$AlterID > ${this.lastAlterIdMaster}`);
        
        await this.syncTable(modifiedTable, 'master', true);
      }
    }
    
    if (transactionChanged) {
      console.log('💼 Syncing changed transaction data...');
      for (const table of this.transactionTables) {
        // Add AlterID filter for incremental sync
        const modifiedTable = { ...table };
        if (!modifiedTable.filters) modifiedTable.filters = [];
        modifiedTable.filters.push(`$AlterID > ${this.lastAlterIdTransaction}`);
        
        await this.syncTable(modifiedTable, 'transaction', true);
      }
    }
  }

  /**
   * Update AlterIDs from Tally
   */
  async updateTallyAlterIds() {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>MyReport</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>ASCII (Comma Delimited)</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="MyReport">
            <FORMS>MyForm</FORMS>
          </REPORT>
          <FORM NAME="MyForm">
            <PARTS>MyPart</PARTS>
          </FORM>
          <PART NAME="MyPart">
            <LINES>MyLine</LINES>
            <REPEAT>MyLine : MyCollection</REPEAT>
            <SCROLLED>Vertical</SCROLLED>
          </PART>
          <LINE NAME="MyLine">
            <FIELDS>FldAlterMaster,FldAlterTransaction</FIELDS>
          </LINE>
          <FIELD NAME="FldAlterMaster">
            <SET>$AltMstId</SET>
          </FIELD>
          <FIELD NAME="FldAlterTransaction">
            <SET>$AltVchId</SET>
          </FIELD>
          <COLLECTION NAME="MyCollection">
            <TYPE>Company</TYPE>
            <FILTER>FilterActiveCompany</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="FilterActiveCompany">${this.config.tally.company ? `$$IsEqual:"${this.escapeHTML(this.config.tally.company)}":$Name` : '$$IsEqual:##SVCurrentCompany:$Name'}</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    
    const response = await this.postTallyXML(xmlRequest);
    const alterIds = response.replace(/"/g, '').split(',');
    
    this.lastAlterIdMaster = parseInt(alterIds[0]) || 0;
    this.lastAlterIdTransaction = parseInt(alterIds[1]) || 0;
    
    console.log(`📋 Current AlterIDs - Master: ${this.lastAlterIdMaster}, Transaction: ${this.lastAlterIdTransaction}`);
  }

  /**
   * Utility function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Escape HTML entities
   */
  escapeHTML(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Main execution
async function main() {
  const sync = new TallyRailwaySync();
  
  try {
    await sync.sync();
    process.exit(0);
  } catch (error) {
    console.error('💥 Sync process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TallyRailwaySync;
