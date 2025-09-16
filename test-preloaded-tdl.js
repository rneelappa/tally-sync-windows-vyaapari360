const axios = require('axios');

async function testPreloadedTDL() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Testing pre-loaded TDL (VyaapariDateFilteredReport)...');
  
  // Simple request using the pre-loaded TDL file
  const requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>VyaapariDateFilteredReport</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>SKM IMPEX-CHENNAI-(24-25)</SVCURRENTCOMPANY>
        <SVFROMDATE>20200101</SVFROMDATE>
        <SVTODATE>20251231</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    console.log('📤 Sending pre-loaded TDL request...');
    console.log('📋 Request length:', requestXml.length, 'characters');
    
    const response = await axios.post(TALLY_URL, requestXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    console.log('📥 Response received:');
    console.log('📊 Response length:', response.data.length, 'characters');
    
    if (response.data.length < 500) {
      console.log('📋 Full response:');
      console.log(response.data);
    } else {
      console.log('📋 Response preview (first 500 chars):');
      console.log(response.data.substring(0, 500));
      console.log('...');
      
      // Count vouchers in the response
      const voucherMatches = response.data.match(/<VOUCHER/g);
      const voucherCount = voucherMatches ? voucherMatches.length : 0;
      console.log(`🎯 VOUCHER COUNT: ${voucherCount}`);
      
      // Look for count field
      const countMatch = response.data.match(/<TOTAL_VOUCHERS>(.*?)<\/TOTAL_VOUCHERS>/);
      if (countMatch) {
        console.log(`📊 TOTAL_VOUCHERS FIELD: ${countMatch[1]}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing pre-loaded TDL:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data.substring(0, 500));
    }
  }
}

// Run the test
testPreloadedTDL().catch(console.error);
