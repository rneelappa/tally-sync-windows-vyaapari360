#!/usr/bin/env node

/**
 * Test script using the exact working curl format
 * This validates our parser with known working Tally responses
 */

const axios = require('axios');
const xml2js = require('xml2js');

// Use the exact working XML format from your curl
const workingXml = `<?xml version="1.0" encoding="utf-8"?>
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
        <SVFROMDATE>20250610</SVFROMDATE>
        <SVTODATE>20250610</SVTODATE>
        <SVCURRENTCOMPANY>SKM IMPEX-CHENNAI-(24-25)</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

async function testWorkingFormat() {
  try {
    console.log('🔄 Testing working XML format directly...');
    
    const response = await axios.post('https://e34014bc0666.ngrok-free.app', workingXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    console.log(`✅ Response received (${response.data.length} chars)`);
    console.log('📋 Response preview:');
    console.log(response.data.substring(0, 1000));
    
    // Parse with our parser
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      explicitCharkey: false,
      trim: true
    });
    
    const parsedData = await parser.parseStringPromise(response.data);
    console.log('\n📊 Parsed data structure:');
    console.log('Keys:', Object.keys(parsedData));
    
    if (parsedData.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE) {
      const messages = Array.isArray(parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE) 
        ? parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE 
        : [parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE];
      
      let voucherCount = 0;
      messages.forEach(msg => {
        if (msg.VOUCHER) {
          const vouchers = Array.isArray(msg.VOUCHER) ? msg.VOUCHER : [msg.VOUCHER];
          voucherCount += vouchers.length;
        }
      });
      
      console.log(`\n🎯 FOUND ${voucherCount} VOUCHERS!`);
      
      if (voucherCount > 0) {
        const firstVoucher = messages[0].VOUCHER;
        const voucher = Array.isArray(firstVoucher) ? firstVoucher[0] : firstVoucher;
        console.log('\n📋 Sample voucher:');
        console.log({
          GUID: voucher.GUID,
          VOUCHERNUMBER: voucher.VOUCHERNUMBER,
          VOUCHERTYPENAME: voucher.VOUCHERTYPENAME,
          DATE: voucher.DATE,
          PARTYLEDGERNAME: voucher.PARTYLEDGERNAME,
          AMOUNT: voucher.AMOUNT
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWorkingFormat();
