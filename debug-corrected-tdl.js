const axios = require('axios');

async function debugCorrectedTDL() {
  const TALLY_URL = 'https://e34014bc0666.ngrok-free.app';
  
  console.log('🔄 Debugging corrected TDL response...');
  
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
    console.log('📋 Full response:');
    console.log(response.data);
    
  } catch (error) {
    console.error('❌ Error testing corrected TDL:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugCorrectedTDL().catch(console.error);
