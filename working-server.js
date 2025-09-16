const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// XML parser
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  explicitCharkey: false,
  trim: true
});

// Helper function to normalize Tally string values
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

// Extract vouchers using the working format
function extractVouchersWorking(parsedData) {
  const vouchers = [];
  
  if (parsedData.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE) {
    const messages = Array.isArray(parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE) 
      ? parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE 
      : [parsedData.ENVELOPE.BODY.DATA.TALLYMESSAGE];
    
    messages.forEach(msg => {
      if (msg.VOUCHER) {
        const voucherArray = Array.isArray(msg.VOUCHER) ? msg.VOUCHER : [msg.VOUCHER];
        
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
    });
  }
  
  return vouchers;
}

// Working sync endpoint using your exact curl format
app.post('/api/v1/working-sync/:fromDate/:toDate', async (req, res) => {
  try {
    const { fromDate, toDate } = req.params;
    
    console.log(`🔄 Working sync: ${fromDate} to ${toDate}`);
    
    // Use your exact working XML format
    const xml = `<?xml version="1.0" encoding="utf-8"?>
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
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
        <SVCURRENTCOMPANY>SKM IMPEX-CHENNAI-(24-25)</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
    
    const response = await axios.post('https://e34014bc0666.ngrok-free.app', xml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    const parsedData = await parser.parseStringPromise(response.data);
    const vouchers = extractVouchersWorking(parsedData);
    
    console.log(`✅ Found ${vouchers.length} vouchers`);
    
    res.json({
      success: true,
      data: {
        totalVouchers: vouchers.length,
        vouchers: vouchers.slice(0, 10), // First 10 for preview
        dateRange: { fromDate, toDate },
        responseSize: response.data.length
      }
    });
    
  } catch (error) {
    console.error('❌ Working sync failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Working server running', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Working server running on port ${PORT}`);
  console.log(`📋 Test: POST http://localhost:${PORT}/api/v1/working-sync/20250610/20250610`);
});
