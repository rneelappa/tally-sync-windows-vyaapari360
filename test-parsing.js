const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  explicitCharkey: false,
  trim: true
});

// Test the parsing logic
function voucherToJson(voucher) {
  // Handle both DayBook and Vouchers Collection formats
  // DayBook uses 'LEDGERENTRIES.LIST' (with dot in property name), Vouchers Collection uses ALLLEDGERENTRIES.LIST
  const ledgerEntries = voucher['LEDGERENTRIES.LIST'] || voucher.ALLLEDGERENTRIES?.LIST || [];
  const inventoryEntries = voucher['INVENTORYENTRIES.LIST'] || voucher.ALLINVENTORYENTRIES?.LIST || [];
  
  console.log('Raw voucher keys:', Object.keys(voucher));
  console.log('LEDGERENTRIES.LIST exists:', !!voucher.LEDGERENTRIES?.LIST);
  console.log('ALLLEDGERENTRIES.LIST exists:', !!voucher.ALLLEDGERENTRIES?.LIST);
  
  // Look for any field containing "LEDGER"
  const ledgerFields = Object.keys(voucher).filter(key => key.includes('LEDGER'));
  console.log('Fields containing LEDGER:', ledgerFields);
  
  // Check if LEDGERENTRIES.LIST exists as a direct property
  if (voucher.LEDGERENTRIES && voucher.LEDGERENTRIES.LIST) {
    console.log('Found LEDGERENTRIES.LIST:', voucher.LEDGERENTRIES.LIST.length, 'entries');
  }
  
  // Check direct access to LEDGERENTRIES.LIST
  if (voucher['LEDGERENTRIES.LIST']) {
    console.log('Found LEDGERENTRIES.LIST (direct):', voucher['LEDGERENTRIES.LIST'].length, 'entries');
    console.log('First entry:', voucher['LEDGERENTRIES.LIST'][0]);
  }
  
  console.log('ledgerEntries length:', ledgerEntries.length);
  
  if (ledgerEntries.length > 0) {
    console.log('First ledger entry:', ledgerEntries[0]);
  }
  
  return {
    id: voucher.ALTERID || voucher.$?.VCHKEY || 'unknown',
    vchkey: voucher.$?.VCHKEY || '',
    alterId: voucher.ALTERID || '',
    date: voucher.DATE || '',
    type: voucher.VOUCHERTYPENAME || voucher.$?.VCHTYPE || '',
    number: voucher.VOUCHERNUMBER || '',
    narration: voucher.NARRATION || '',
    isInvoice: voucher.$?.ISINVOICE === 'Yes',
    isModify: voucher.$?.ISMODIFY === 'Yes',
    isDeleted: voucher.$?.ISDELETED === 'Yes',
    isOptional: voucher.$?.ISOPTIONAL === 'Yes',
    effectiveDate: voucher.EFFECTIVEDATE || '',
    voucherTypeId: voucher.VOUCHERTYPEID || '',
    voucherTypeName: voucher.VOUCHERTYPENAME || '',
    partyLedgerName: voucher.PARTYLEDGERNAME || '',
    entries: Array.isArray(ledgerEntries) ? ledgerEntries.map((entry, index) => ({
      index: index + 1,
      ledgerName: entry.LEDGERNAME || '',
      amount: parseFloat(entry.AMOUNT || 0),
      isDeemedPositive: entry.ISDEEMEDPOSITIVE === 'Yes',
      isPartyLedger: entry.ISPARTYLEDGER === 'Yes',
      ledgerId: entry.LEDGERID || ''
    })) : [],
    inventoryEntries: Array.isArray(inventoryEntries) ? inventoryEntries.map((entry, index) => ({
      index: index + 1,
      stockItemName: entry.STOCKITEMNAME || '',
      stockItemId: entry.STOCKITEMID || '',
      rate: parseFloat(entry.RATE || 0),
      amount: parseFloat(entry.AMOUNT || 0),
      billedQuantity: parseFloat(entry.BILLEDQTY || 0),
      actualQuantity: parseFloat(entry.ACTUALQTY || 0),
      unit: entry.UNIT || '',
      godownName: entry.GODOWNNAME || '',
      godownId: entry.GODOWNID || ''
    })) : []
  };
}

async function testParsing() {
  try {
    console.log('🔍 Testing voucher parsing...');
    
    const tallyUrl = 'https://e34014bc0666.ngrok-free.app';
    
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

    const response = await axios.post(tallyUrl, dayBookXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    const data = await parser.parseStringPromise(response.data);
    
    if (data.ENVELOPE.BODY.DATA.TALLYMESSAGE) {
      const messages = Array.isArray(data.ENVELOPE.BODY.DATA.TALLYMESSAGE) 
        ? data.ENVELOPE.BODY.DATA.TALLYMESSAGE 
        : [data.ENVELOPE.BODY.DATA.TALLYMESSAGE];
      
      if (messages[0] && messages[0].VOUCHER) {
        const vouchers = Array.isArray(messages[0].VOUCHER) 
          ? messages[0].VOUCHER 
          : [messages[0].VOUCHER];
        
        console.log('\n📋 Testing first voucher parsing:');
        const parsedVoucher = voucherToJson(vouchers[0]);
        console.log('Parsed voucher entries:', parsedVoucher.entries.length);
        console.log('First entry:', parsedVoucher.entries[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testParsing();
