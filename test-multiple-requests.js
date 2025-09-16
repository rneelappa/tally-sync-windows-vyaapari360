const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Helper function to normalize Tally string values
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

// Helper function to parse Tally date format (DD-MMM-YY) to Date object
function parseTallyDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle DD-MMM-YY format (e.g., "05-Jun-25")
    const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (match) {
      const day = parseInt(match[1]);
      const monthStr = match[2];
      const year = parseInt(match[3]) + 2000; // Convert YY to YYYY
      
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const month = monthMap[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback to standard Date parsing
    return new Date(dateStr);
  } catch (error) {
    console.warn(`⚠️ Failed to parse date: ${dateStr}`, error.message);
    return null;
  }
}

// Extract vouchers from Tally response
function extractVouchers(parsedData) {
  const vouchers = [];
  console.log('🔍 Extracting vouchers from parsed data...');
  
  // Handle different response structures
  let dataSource = null;
  
  // Try different possible structures
  if (parsedData.ENVELOPE?.BODY?.DATA) {
    dataSource = parsedData.ENVELOPE.BODY.DATA;
    console.log('📋 Found data in ENVELOPE.BODY.DATA structure');
  } else if (parsedData.RESPONSE?.BODY?.DATA) {
    dataSource = parsedData.RESPONSE.BODY.DATA;
    console.log('📋 Found data in RESPONSE.BODY.DATA structure');
  } else if (parsedData.DAYBOOK) {
    dataSource = { DAYBOOK: parsedData.DAYBOOK };
    console.log('📋 Found data in DAYBOOK structure');
  } else if (parsedData.TALLYMESSAGE) {
    dataSource = { TALLYMESSAGE: parsedData.TALLYMESSAGE };
    console.log('📋 Found data in TALLYMESSAGE structure');
  }
  
  if (!dataSource) {
    console.warn('⚠️ No recognizable data structure found in response');
    console.log('Available keys:', Object.keys(parsedData));
    return vouchers;
  }
  
  // Process DAYBOOK structure
  if (dataSource.DAYBOOK) {
    console.log('📊 Processing DAYBOOK vouchers...');
    const daybook = dataSource.DAYBOOK;
    
    if (daybook.VOUCHER) {
      const voucherArray = Array.isArray(daybook.VOUCHER) ? daybook.VOUCHER : [daybook.VOUCHER];
      voucherArray.forEach(voucher => {
        vouchers.push({
          GUID: normalize(voucher.GUID),
          VOUCHERNUMBER: normalize(voucher.VOUCHERNUMBER),
          VOUCHERTYPENAME: normalize(voucher.VOUCHERTYPENAME),
          DATE: normalize(voucher.DATE),
          PARTYLEDGERNAME: normalize(voucher.PARTYLEDGERNAME),
          NARRATION: normalize(voucher.NARRATION),
          AMOUNT: parseFloat(normalize(voucher.AMOUNT) || 0),
          ISINVOICE: false,
          ISACCOUNTING: true,
          ISINVENTORY: false,
          entries: [],
          inventoryEntries: []
        });
      });
    }
    
    console.log(`✅ Extracted ${vouchers.length} vouchers from DAYBOOK`);
    return vouchers;
  }
  
  // Process standard Tally TALLYMESSAGE structure
  if (dataSource.TALLYMESSAGE) {
    console.log('📊 Processing TALLYMESSAGE vouchers...');
    const tallyMessages = dataSource.TALLYMESSAGE;
    const messageArray = Array.isArray(tallyMessages) ? tallyMessages : [tallyMessages];
    
    messageArray.forEach(message => {
      if (message.VOUCHER) {
        const voucherArray = Array.isArray(message.VOUCHER) ? message.VOUCHER : [message.VOUCHER];
        voucherArray.forEach(voucher => {
          const voucherData = {
            GUID: normalize(voucher.GUID),
            VOUCHERNUMBER: normalize(voucher.VOUCHERNUMBER),
            VOUCHERTYPENAME: normalize(voucher.VOUCHERTYPENAME),
            DATE: normalize(voucher.DATE),
            PARTYLEDGERNAME: normalize(voucher.PARTYLEDGERNAME),
            NARRATION: normalize(voucher.NARRATION),
            AMOUNT: parseFloat(normalize(voucher.AMOUNT) || 0),
            ISINVOICE: normalize(voucher.ISINVOICE) === 'Yes',
            ISACCOUNTING: normalize(voucher.ISACCOUNTING) === 'Yes',
            ISINVENTORY: normalize(voucher.ISINVENTORY) === 'Yes',
            entries: [],
            inventoryEntries: []
          };
          
          // Process ledger entries
          if (voucher.ALLLEDGERENTRIES?.LIST) {
            const entries = Array.isArray(voucher.ALLLEDGERENTRIES.LIST) ? voucher.ALLLEDGERENTRIES.LIST : [voucher.ALLLEDGERENTRIES.LIST];
            voucherData.entries = entries.map(entry => ({
              LEDGERNAME: normalize(entry.LEDGERNAME),
              AMOUNT: parseFloat(normalize(entry.AMOUNT) || 0),
              ISDEEMEDPOSITIVE: normalize(entry.ISDEEMEDPOSITIVE) === 'Yes'
            }));
          }
          
          // Process inventory entries
          if (voucher.ALLINVENTORYENTRIES?.LIST) {
            const entries = Array.isArray(voucher.ALLINVENTORYENTRIES.LIST) ? voucher.ALLINVENTORYENTRIES.LIST : [voucher.ALLINVENTORYENTRIES.LIST];
            voucherData.inventoryEntries = entries.map(entry => ({
              STOCKITEMNAME: normalize(entry.STOCKITEMNAME),
              QUANTITY: parseFloat(normalize(entry.QUANTITY) || 0),
              RATE: parseFloat(normalize(entry.RATE) || 0),
              AMOUNT: parseFloat(normalize(entry.AMOUNT) || 0),
              GODOWNNAME: normalize(entry.GODOWNNAME)
            }));
          }
          
          vouchers.push(voucherData);
        });
      }
    });
    
    console.log(`✅ Extracted ${vouchers.length} vouchers from TALLYMESSAGE`);
    return vouchers;
  }
  
  return vouchers;
}

// Create Tally XML request
function createTallyRequest(fromDate = '', toDate = '') {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Day Book</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>SKM IMPEX-CHENNAI-(24-25)</SVCURRENTCOMPANY>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

// Test multiple requests solution
async function testMultipleRequests() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Testing multiple requests solution...');
  
  const allVouchers = [];
  const yearRanges = [
    { from: '20200101', to: '20201231' },
    { from: '20210101', to: '20211231' },
    { from: '20220101', to: '20221231' },
    { from: '20230101', to: '20231231' },
    { from: '20240101', to: '20241231' },
    { from: '20250101', to: '20251231' }
  ];
  
  for (const range of yearRanges) {
    try {
      console.log(`🔄 Fetching vouchers for ${range.from} to ${range.to}...`);
      
      const requestXml = createTallyRequest(range.from, range.to);
      
      const response = await axios.post(TALLY_URL, requestXml, {
        headers: {
          'Content-Type': 'application/xml',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 30000
      });
      
      const parsedData = await parser.parseStringPromise(response.data);
      const vouchers = extractVouchers(parsedData);
      
      console.log(`✅ Found ${vouchers.length} vouchers for ${range.from} to ${range.to}`);
      allVouchers.push(...vouchers);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.warn(`⚠️ Error fetching vouchers for ${range.from} to ${range.to}:`, error.message);
    }
  }
  
  console.log(`\n🎯 TOTAL VOUCHERS FETCHED: ${allVouchers.length}`);
  
  // Show sample vouchers
  if (allVouchers.length > 0) {
    console.log('\n📋 Sample vouchers:');
    allVouchers.slice(0, 3).forEach((voucher, index) => {
      console.log(`${index + 1}. ${voucher.VOUCHERNUMBER} - ${voucher.VOUCHERTYPENAME} - ${voucher.DATE} - ${voucher.AMOUNT}`);
    });
  }
  
  return allVouchers;
}

// Run the test
testMultipleRequests().catch(console.error);
