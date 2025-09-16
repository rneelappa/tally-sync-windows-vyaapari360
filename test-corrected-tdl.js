const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Helper function to normalize Tally string values
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

// Test the corrected TDL approach
async function testCorrectedTDL() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Testing corrected TDL with proper scoping...');
  
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
      <TDL>
        <TDLMESSAGE>
          [System: Formulae]
            VyaNotCancelled: (NOT $IsCancelled) AND (NOT $IsOptional)
            VyaDateBetween: ($Date >= $$Date:##SVFROMDATE) AND ($Date <= $$Date:##SVTODATE)

          [Report: VyaapariDateFilteredReport]
            Variable: SVFROMDATE, SVTODATE, SVCURRENTCOMPANY, SVEXPORTFORMAT
            Forms: VyaForm

          [Form: VyaForm]
            Parts: VyaPart
            XMLTAG: ENVELOPE

          [Part: VyaPart]
            Lines: VyaLine, VyaCountLine
            Repeat: VyaLine : VyaapariVoucherCollection
            SCROLLED: Vertical

          [Line: VyaLine]
            Fields: FGuid, FDate, FType, FNumber, FRef, FRefDate, FNarr, FParty, FPos, FIsInv, FIsAcc, FIsInvt, FAmt
            XMLTAG: VOUCHER

          [Line: VyaCountLine]
            Fields: FCount
            XMLTAG: COUNT

          [Field: FCount]
            XMLTAG: TOTAL_VOUCHERS
            Set: $$NumItems:VyaapariVoucherCollection

          [Field: FGuid]
            XMLTAG: GUID
            Set: $Guid

          [Field: FDate]
            XMLTAG: DATE
            Set: $Date

          [Field: FType]
            XMLTAG: VOUCHERTYPENAME
            Set: $VoucherTypeName

          [Field: FNumber]
            XMLTAG: VOUCHERNUMBER
            Set: $VoucherNumber

          [Field: FRef]
            XMLTAG: REFERENCE
            Set: $Reference

          [Field: FRefDate]
            XMLTAG: REFERENCEDATE
            Set: $ReferenceDate

          [Field: FNarr]
            XMLTAG: NARRATION
            Set: $$StringFindAndReplace:$Narration:'"':'""'

          [Field: FParty]
            XMLTAG: PARTYLEDGERNAME
            Set: $$StringFindAndReplace:$PartyLedgerName:'"':'""'

          [Field: FPos]
            XMLTAG: PLACEOFSUPPLY
            Set: $$StringFindAndReplace:$PlaceOfSupply:'"':'""'

          [Field: FIsInv]
            XMLTAG: ISINVOICE
            Set: if $$IsSales:$VoucherTypeName or $$IsPurchase:$VoucherTypeName then 1 else 0

          [Field: FIsAcc]
            XMLTAG: ISACCOUNTING
            Set: if $$IsAccountingVch:$VoucherTypeName then 1 else 0

          [Field: FIsInvt]
            XMLTAG: ISINVENTORY
            Set: if $$IsInventoryVch:$VoucherTypeName then 1 else 0

          [Field: FAmt]
            XMLTAG: AMOUNT
            Set: $Amount

          [Collection: VyaapariVoucherCollection]
            Type: Voucher
            Child Of: Company : ##SVCURRENTCOMPANY
            Belongs To: Yes
            Fetch: Guid, Date, VoucherTypeName, VoucherNumber, Reference, ReferenceDate, Narration, PartyLedgerName, PlaceOfSupply, Amount, IsCancelled, IsOptional
            Filters: VyaNotCancelled, VyaDateBetween
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  try {
    console.log('📤 Sending corrected TDL request...');
    
    const response = await axios.post(TALLY_URL, requestXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    console.log('📥 Response received, parsing...');
    console.log('📊 Response length:', response.data.length, 'characters');
    
    const parsedData = await parser.parseStringPromise(response.data);
    
    // Look for the count field
    if (parsedData.ENVELOPE?.BODY?.DATA?.COUNT?.TOTAL_VOUCHERS) {
      const totalVouchers = parsedData.ENVELOPE.BODY.DATA.COUNT.TOTAL_VOUCHERS;
      console.log(`🎯 TOTAL VOUCHERS REPORTED BY TALLY: ${totalVouchers}`);
    }
    
    // Count actual vouchers
    let voucherCount = 0;
    if (parsedData.ENVELOPE?.BODY?.DATA?.VOUCHER) {
      const vouchers = Array.isArray(parsedData.ENVELOPE.BODY.DATA.VOUCHER) 
        ? parsedData.ENVELOPE.BODY.DATA.VOUCHER 
        : [parsedData.ENVELOPE.BODY.DATA.VOUCHER];
      voucherCount = vouchers.length;
      
      console.log(`📋 ACTUAL VOUCHERS EXTRACTED: ${voucherCount}`);
      
      if (voucherCount > 0) {
        console.log('\n📋 Sample vouchers:');
        vouchers.slice(0, 3).forEach((voucher, index) => {
          console.log(`${index + 1}. ${voucher.VOUCHERNUMBER} - ${voucher.VOUCHERTYPENAME} - ${voucher.DATE} - ${voucher.AMOUNT}`);
        });
      }
    }
    
    // Show raw response structure for debugging
    console.log('\n🔍 Response structure:');
    console.log('Available keys:', Object.keys(parsedData.ENVELOPE?.BODY?.DATA || {}));
    
    return voucherCount;
    
  } catch (error) {
    console.error('❌ Error testing corrected TDL:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data.substring(0, 500));
    }
    return 0;
  }
}

// Run the test
testCorrectedTDL().catch(console.error);
