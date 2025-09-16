const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Helper function to normalize Tally string values
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

async function testStockSummary() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Testing Stock Summary parsing...');
  
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
    console.log('📋 Parsed structure:', Object.keys(parsedData.ENVELOPE || {}));
    
    if (parsedData.ENVELOPE?.DSPACCNAME) {
      const nameArray = Array.isArray(parsedData.ENVELOPE.DSPACCNAME) ? 
        parsedData.ENVELOPE.DSPACCNAME : [parsedData.ENVELOPE.DSPACCNAME];
      
      console.log(`🎯 Found ${nameArray.length} stock items`);
      
      nameArray.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.DSPDISPNAME}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStockSummary();
