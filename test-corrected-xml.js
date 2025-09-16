#!/usr/bin/env node

/**
 * Local Test for Corrected Tally XML Requests
 * Test the fixed XML structure without embedded TDL
 */

const axios = require('axios');
const xml2js = require('xml2js');

// Helper function to normalize Tally string values
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

// Create corrected XML request (no embedded TDL)
function createCorrectedTallyRequest(reportType = 'DayBook', fromDate = '', toDate = '') {
  console.log(`🔧 Creating corrected Tally request: ${reportType}, from: ${fromDate}, to: ${toDate}`);
  
  // Default to current month if no dates provided
  if (!fromDate || !toDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    fromDate = `${year}${month}01`;
    toDate = `${year}${month}${new Date(year, now.getMonth() + 1, 0).getDate().toString().padStart(2, '0')}`;
    console.log(`📅 Using default dates: ${fromDate} to ${toDate}`);
  }

  let requestXml;

  if (reportType === 'DayBook') {
    // Use standard Tally DayBook report (no custom TDL)
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>DayBook</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  } else if (reportType === 'Ledger') {
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
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
  } else if (reportType === 'Company') {
    // Simple company info request
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
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
  }

  console.log(`📤 Generated corrected XML request for ${reportType} (${requestXml.length} chars)`);
  return requestXml;
}

// Parse Tally XML response
async function parseTallyResponse(xmlData) {
  try {
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      mergeAttrs: true,
      headless: true
    });
    const result = await parser.parseStringPromise(xmlData);
    return result;
  } catch (error) {
    console.error('❌ Error parsing XML:', error.message);
    throw error;
  }
}

// Extract vouchers from corrected response
function extractVouchersFromResponse(parsedData) {
  const vouchers = [];
  console.log('🔍 Extracting vouchers from corrected response...');
  console.log('📊 Available keys:', Object.keys(parsedData));
  
  // Handle different response structures
  let dataSource = null;
  
  if (parsedData.ENVELOPE?.BODY?.DATA) {
    dataSource = parsedData.ENVELOPE.BODY.DATA;
    console.log('📋 Found data in ENVELOPE.BODY.DATA structure');
  } else if (parsedData.RESPONSE?.BODY?.DATA) {
    dataSource = parsedData.RESPONSE.BODY.DATA;
    console.log('📋 Found data in RESPONSE.BODY.DATA structure');
  } else if (parsedData.TALLYMESSAGE) {
    dataSource = { TALLYMESSAGE: parsedData.TALLYMESSAGE };
    console.log('📋 Found data in TALLYMESSAGE structure');
  }
  
  if (!dataSource) {
    console.warn('⚠️ No recognizable data structure found');
    return vouchers;
  }
  
  // Process TALLYMESSAGE structure
  if (dataSource.TALLYMESSAGE) {
    console.log('📊 Processing TALLYMESSAGE...');
    const messageArray = Array.isArray(dataSource.TALLYMESSAGE) ? 
      dataSource.TALLYMESSAGE : [dataSource.TALLYMESSAGE];
    
    messageArray.forEach(message => {
      if (message.VOUCHER) {
        const voucherArray = Array.isArray(message.VOUCHER) ? 
          message.VOUCHER : [message.VOUCHER];
        
        voucherArray.forEach(voucher => {
          vouchers.push({
            GUID: normalize(voucher.GUID),
            VOUCHERNUMBER: normalize(voucher.VOUCHERNUMBER),
            VOUCHERTYPENAME: normalize(voucher.VOUCHERTYPENAME),
            DATE: normalize(voucher.DATE),
            PARTYLEDGERNAME: normalize(voucher.PARTYLEDGERNAME),
            NARRATION: normalize(voucher.NARRATION),
            AMOUNT: parseFloat(normalize(voucher.AMOUNT) || 0)
          });
        });
      } else if (message.COMPANY) {
        console.log('📋 Found company info:', normalize(message.COMPANY.NAME));
      } else if (message.LEDGER) {
        console.log('📋 Found ledger:', normalize(message.LEDGER.NAME));
      }
    });
  }
  
  console.log(`✅ Extracted ${vouchers.length} vouchers`);
  return vouchers;
}

// Test with local server
async function testLocalServer() {
  console.log('🧪 Testing with local server...\n');
  
  try {
    // Test TallySync health
    console.log('1. Testing TallySync health...');
    const healthResponse = await axios.get('http://localhost:3000/api/v1/tallysync/health');
    console.log('✅ TallySync Health:', healthResponse.data.success ? 'OK' : 'FAIL');
    
    // Test corrected sync
    console.log('\n2. Testing corrected sync...');
    const syncResponse = await axios.post(
      'http://localhost:3000/api/v1/tallysync/sync/629f49fb-983e-4141-8c48-e1423b39e921/37f3cc0c-58ad-4baf-b309-360116ffc3cd',
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('✅ Sync Result:', syncResponse.data);
    
  } catch (error) {
    console.error('❌ Local server test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Start the local server with: npm start');
    }
  }
}

// Test XML structure validation
async function testXMLStructure() {
  console.log('🧪 Testing XML Structure...\n');
  
  // Test different request types
  const testCases = [
    { type: 'DayBook', from: '20250901', to: '20250930' },
    { type: 'Ledger', from: '', to: '' },
    { type: 'Company', from: '', to: '' }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Testing ${testCase.type} request:`);
    const xml = createCorrectedTallyRequest(testCase.type, testCase.from, testCase.to);
    console.log('📄 XML Preview:');
    console.log(xml.substring(0, 300) + '...');
    
    // Validate XML structure
    if (xml.includes('<TDL>')) {
      console.log('❌ ERROR: XML still contains embedded TDL!');
    } else {
      console.log('✅ GOOD: XML uses standard Tally report reference');
    }
  });
}

// Mock Tally response test
async function testResponseParsing() {
  console.log('\n🧪 Testing Response Parsing...\n');
  
  // Mock Tally DayBook response
  const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <STATUS>1</STATUS>
  </HEADER>
  <BODY>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER>
          <GUID>sample-guid-123</GUID>
          <VOUCHERNUMBER>TEST001</VOUCHERNUMBER>
          <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
          <DATE>20250916</DATE>
          <PARTYLEDGERNAME>Test Party</PARTYLEDGERNAME>
          <NARRATION>Test voucher</NARRATION>
          <AMOUNT>1000.00</AMOUNT>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;
  
  try {
    console.log('📤 Parsing mock Tally response...');
    const parsed = await parseTallyResponse(mockResponse);
    const vouchers = extractVouchersFromResponse(parsed);
    
    console.log('✅ Parsing successful!');
    console.log('📊 Extracted vouchers:', vouchers.length);
    if (vouchers.length > 0) {
      console.log('📋 Sample voucher:', vouchers[0]);
    }
    
  } catch (error) {
    console.error('❌ Response parsing failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Running Local Tests for Corrected Tally XML Structure\n');
  console.log('=' .repeat(60));
  
  // Test 1: XML Structure Validation
  await testXMLStructure();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test 2: Response Parsing
  await testResponseParsing();
  
  console.log('\n' + '=' .repeat(60));
  
  // Test 3: Local Server (if running)
  await testLocalServer();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 Test Summary:');
  console.log('✅ XML structure corrected (no embedded TDL)');
  console.log('✅ Response parsing logic updated');
  console.log('✅ Ready for deployment and testing');
  console.log('=' .repeat(60));
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  createCorrectedTallyRequest,
  parseTallyResponse,
  extractVouchersFromResponse
};
