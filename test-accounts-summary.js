const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

async function testAccountsSummary() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Testing if List of Accounts returns Summary format...');
  
  const requestXml = `<?xml version="1.0" encoding="utf-8"?>
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
    console.log('📋 Response structure keys:', Object.keys(parsedData.ENVELOPE || {}));
    
    // Check if it has DSPACCNAME (Summary format)
    if (parsedData.ENVELOPE?.DSPACCNAME) {
      console.log('🎯 List of Accounts returns Summary format!');
      const nameArray = Array.isArray(parsedData.ENVELOPE.DSPACCNAME) ? 
        parsedData.ENVELOPE.DSPACCNAME : [parsedData.ENVELOPE.DSPACCNAME];
      console.log(`📊 Found ${nameArray.length} account items in Summary format`);
      
      nameArray.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.DSPDISPNAME}`);
      });
    } else if (parsedData.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE) {
      console.log('🎯 List of Accounts returns TALLYMESSAGE format!');
      const tallyMessage = parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE;
      const messageList = Array.isArray(tallyMessage) ? tallyMessage : [tallyMessage];
      let ledgerCount = 0;
      messageList.forEach(msg => {
        if (msg.LEDGER) {
          const ledgers = Array.isArray(msg.LEDGER) ? msg.LEDGER : [msg.LEDGER];
          ledgerCount += ledgers.length;
        }
      });
      console.log(`📊 Found ${ledgerCount} ledgers in TALLYMESSAGE format`);
    } else {
      console.log('❌ Unknown format for List of Accounts');
      console.log('Available keys:', Object.keys(parsedData.ENVELOPE || {}));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAccountsSummary();
