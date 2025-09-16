const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Helper function to normalize Tally string values
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

// Simulate the exact extractMasterData function from server.js
function extractMasterData(parsedData, dataType) {
  const items = [];
  console.log(`🔍 Extracting ${dataType} master data from parsed data...`);
  
  let dataSource = null;
  
  if (parsedData.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE) {
    dataSource = parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE;
    console.log(`📋 Found ${dataType} in ENVELOPE.BODY.DATA.TALLYMESSAGE structure`);
  } else if (parsedData.RESPONSE?.BODY?.DATA?.TALLYMESSAGE) {
    dataSource = parsedData.RESPONSE.BODY.DATA.TALLYMESSAGE;
    console.log(`📋 Found ${dataType} in RESPONSE.BODY.DATA.TALLYMESSAGE structure`);
  } else if (parsedData.ENVELOPE?.TALLYMESSAGE) {
    dataSource = parsedData.ENVELOPE.TALLYMESSAGE;
    console.log(`📋 Found ${dataType} in ENVELOPE.TALLYMESSAGE structure`);
  } else if (parsedData.TALLYMESSAGE) {
    dataSource = parsedData.TALLYMESSAGE;
    console.log(`📋 Found ${dataType} in TALLYMESSAGE structure`);
  }
  
  // Handle Summary report formats (Group Summary, Stock Summary) - CHECK THIS FIRST
  if (parsedData.ENVELOPE?.DSPACCNAME) {
    console.log(`📋 Found ${dataType} in Summary report format (DSPACCNAME)`);
    console.log(`🔍 Debug: DSPACCNAME structure:`, Object.keys(parsedData.ENVELOPE.DSPACCNAME));
    const nameArray = Array.isArray(parsedData.ENVELOPE.DSPACCNAME) ? 
      parsedData.ENVELOPE.DSPACCNAME : [parsedData.ENVELOPE.DSPACCNAME];
    console.log(`📊 Debug: Processing ${nameArray.length} ${dataType} items...`);
    
    nameArray.forEach((nameItem, index) => {
      if (nameItem.DSPDISPNAME) {
        const item = {
          GUID: `summary-${dataType.toLowerCase()}-${index}`, // Generate GUID for summary items
          NAME: normalize(nameItem.DSPDISPNAME),
          PARENT: '',
          TYPE: dataType
        };
        
        // Add additional fields based on type
        if (dataType === 'GROUP') {
          // Group summary data
          items.push(item);
        } else if (dataType === 'STOCKITEM') {
          // Stock summary data - add stock info if available
          const stockInfo = parsedData.ENVELOPE.DSPSTKINFO?.[index];
          if (stockInfo?.DSPSTKCL) {
            item.QUANTITY = normalize(stockInfo.DSPSTKCL.DSPCLQTY) || '';
            item.RATE = parseFloat(normalize(stockInfo.DSPSTKCL.DSPCLRATE) || 0);
            item.AMOUNT = parseFloat(normalize(stockInfo.DSPSTKCL.DSPCLAMTA) || 0);
          }
          items.push(item);
        }
      }
    });
    
    console.log(`✅ Extracted ${items.length} ${dataType} items from Summary format`);
    return items;
  }
  
  if (!dataSource) {
    console.warn(`⚠️ No recognizable ${dataType} data structure found in response`);
    console.log('Available keys:', Object.keys(parsedData));
    return items;
  }

  const messageList = Array.isArray(dataSource) ? dataSource : [dataSource];

  messageList.forEach(msg => {
    if (msg[dataType]) {
      const itemArray = Array.isArray(msg[dataType]) ? msg[dataType] : [msg[dataType]];
      
      itemArray.forEach(item => {
        const masterItem = {
          GUID: normalize(item.GUID),
          NAME: normalize(item.NAME),
          PARENT: normalize(item.PARENT) || '',
          ...(item.OPENINGBALANCE && { OPENINGBALANCE: parseFloat(normalize(item.OPENINGBALANCE) || 0) }),
          ...(item.CLOSINGBALANCE && { CLOSINGBALANCE: parseFloat(normalize(item.CLOSINGBALANCE) || 0) }),
          ...(item.BASEUNITS && { BASEUNITS: normalize(item.BASEUNITS) }),
          ...(item.ISREVENUE && { ISREVENUE: normalize(item.ISREVENUE) === 'Yes' }),
          ...(item.ISDEEMEDPOSITIVE && { ISDEEMEDPOSITIVE: normalize(item.ISDEEMEDPOSITIVE) === 'Yes' }),
          ...(item.ISRESERVED && { ISRESERVED: normalize(item.ISRESERVED) === 'Yes' }),
          ...(item.AFFECTSGROSSPROFIT && { AFFECTSGROSSPROFIT: normalize(item.AFFECTSGROSSPROFIT) === 'Yes' }),
          ...(item.SORTPOSITION && { SORTPOSITION: parseInt(normalize(item.SORTPOSITION) || 0) }),
          ...(item.DESCRIPTION && { DESCRIPTION: normalize(item.DESCRIPTION) }),
          ...(item.ALIAS && { ALIAS: normalize(item.ALIAS) }),
          ...(item.NARRATION && { NARRATION: normalize(item.NARRATION) }),
          ...(item.SYMBOL && { SYMBOL: normalize(item.SYMBOL) }),
          ...(item.FORMALNAME && { FORMALNAME: normalize(item.FORMALNAME) }),
          ...(item.CONVERSION && { CONVERSION: parseFloat(normalize(item.CONVERSION) || 1) })
        };
        
        items.push(masterItem);
      });
    }
  });
  
  console.log(`✅ Extracted ${items.length} ${dataType} items`);
  return items;
}

async function debugStockParsing() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Testing Stock Summary parsing with exact server logic...');
  
  const requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Stock Summary</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>SKM IMPEX-CHENNAI-(24-25)</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    const response = await axios.post(TALLY_URL, requestXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    console.log(`📊 Response length: ${response.data.length} characters`);
    
    const parsedData = await parser.parseStringPromise(response.data);
    
    // Test with exact server logic
    const stockItems = extractMasterData(parsedData, 'STOCKITEM');
    console.log(`🎯 Final result: ${stockItems.length} stock items extracted`);
    
    if (stockItems.length > 0) {
      console.log('📋 Sample stock items:');
      stockItems.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.NAME} (GUID: ${item.GUID})`);
        if (item.QUANTITY) console.log(`   Quantity: ${item.QUANTITY}, Rate: ${item.RATE}, Amount: ${item.AMOUNT}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugStockParsing();
