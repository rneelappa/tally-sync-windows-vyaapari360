const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  explicitCharkey: false,
  trim: true
});

async function debugVoucherData() {
  try {
    console.log('🔍 Testing Tally data fetching...');
    
    // Test with current ngrok URL
    const tallyUrl = 'https://e34014bc0666.ngrok-free.app';
    
    // Test DayBook
    console.log('\n📋 Testing DayBook...');
    const dayBookXml = `<?xml version="1.0" encoding="utf-8"?>
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
        <SVFROMDATE>20250901</SVFROMDATE>
        <SVTODATE>20250930</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const dayBookResponse = await axios.post(tallyUrl, dayBookXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    const dayBookData = await parser.parseStringPromise(dayBookResponse.data);
    console.log('DayBook response structure:');
    console.log('Full structure:', JSON.stringify(dayBookData.ENVELOPE.BODY.DATA, null, 2));
    
    if (dayBookData.ENVELOPE.BODY.DATA.TALLYMESSAGE) {
      const messages = Array.isArray(dayBookData.ENVELOPE.BODY.DATA.TALLYMESSAGE) 
        ? dayBookData.ENVELOPE.BODY.DATA.TALLYMESSAGE 
        : [dayBookData.ENVELOPE.BODY.DATA.TALLYMESSAGE];
      
      if (messages[0] && messages[0].VOUCHER) {
        const vouchers = Array.isArray(messages[0].VOUCHER) 
          ? messages[0].VOUCHER 
          : [messages[0].VOUCHER];
        console.log('First voucher:', JSON.stringify(vouchers[0], null, 2));
      }
    }
    
    // Test Vouchers Collection
    console.log('\n📋 Testing Vouchers Collection...');
    const vouchersXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>20250901</SVFROMDATE>
        <SVTODATE>20250930</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const vouchersResponse = await axios.post(tallyUrl, vouchersXml, {
        headers: {
          'Content-Type': 'application/xml',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 30000
      });
      
      const vouchersData = await parser.parseStringPromise(vouchersResponse.data);
      console.log('Vouchers Collection response structure:');
      console.log(JSON.stringify(vouchersData.ENVELOPE.BODY.DATA.TALLYMESSAGE.VOUCHER[0], null, 2));
    } catch (error) {
      console.log('❌ Vouchers Collection failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugVoucherData();


