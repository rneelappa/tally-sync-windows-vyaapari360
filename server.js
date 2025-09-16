const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/xml', limit: '10mb' }));

// Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// XML parser
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  explicitCharkey: false,
  trim: true
});

const builder = new xml2js.Builder({
  explicitArray: false,
  mergeAttrs: true,
  headless: true
});

// Helper function to normalize Tally string values (remove extra spaces, newlines, etc.)
function normalize(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

// In-memory XML storage (for Railway - consider Redis for production)
const xmlStorage = new Map();

// Master data storage for all Tally entities
const masterDataStorage = {
  ledgers: new Map(),
  groups: new Map(),
  stockItems: new Map(),
  voucherTypes: new Map(),
  units: new Map(),
  godowns: new Map(),
  costCenters: new Map(),
  taxMasters: new Map()
};

// Cache for Tally URLs to avoid repeated Supabase calls
const tallyUrlCache = new Map();

// Fetch Tally URL from Supabase for a specific division
async function getTallyUrl(companyId, divisionId) {
  const cacheKey = `${companyId}/${divisionId}`;
  
  // Check cache first
  if (tallyUrlCache.has(cacheKey)) {
    const cached = tallyUrlCache.get(cacheKey);
    // Cache for 5 minutes
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.url;
    }
  }
  
  try {
    console.log(`🔍 Fetching Tally URL for ${companyId}/${divisionId} from Supabase...`);
    
    const { data, error } = await supabase
      .from('divisions')
      .select('tally_url')
      .eq('company_id', companyId)
      .eq('id', divisionId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching Tally URL:', error.message);
      throw new Error(`Failed to fetch Tally URL: ${error.message}`);
    }
    
    if (!data || !data.tally_url) {
      throw new Error(`No Tally URL found for ${companyId}/${divisionId}`);
    }
    
    // Cache the URL
    tallyUrlCache.set(cacheKey, {
      url: data.tally_url,
      timestamp: Date.now()
    });
    
    console.log(`✅ Found Tally URL: ${data.tally_url}`);
    return data.tally_url;
    
  } catch (error) {
    console.error('❌ Error getting Tally URL:', error.message);
    throw error;
  }
}

// Helper function to create proper Tally XML requests
function createTallyRequest(reportType = 'DayBook', fromDate = '', toDate = '') {
  console.log(`🔧 Creating Tally request: ${reportType}, from: ${fromDate}, to: ${toDate}`);
  
  // Default to current month if no dates provided
  if (!fromDate || !toDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    fromDate = `${year}${month}01`;
    toDate = `${year}${month}${new Date(year, now.getMonth() + 1, 0).getDate().toString().padStart(2, '0')}`;
    console.log(`📅 Using default dates: ${fromDate} to ${toDate}`);
  }

  let requestXml;

  if (reportType === 'Vouchers' || reportType === 'DayBook') {
    // Use standard Tally DayBook report (no custom TDL)
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
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
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  } else if (reportType === 'Ledger') {
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
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
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  } else if (reportType === 'Group') {
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Groups</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  } else if (reportType === 'StockItem') {
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Stock Items</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  } else if (reportType === 'VoucherType') {
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Voucher Types</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  } else {
    // Generic request
    requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>${reportType}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        ${fromDate && toDate ? `<SVFROMDATE>${fromDate}</SVFROMDATE><SVTODATE>${toDate}</SVTODATE>` : ''}
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  }

  console.log(`📤 Generated XML request for ${reportType}`);
  return requestXml;
}

// Fetch data from Tally
async function fetchTallyData(companyId, divisionId, reportType = 'DayBook', fromDate = '', toDate = '') {
  try {
    console.log(`🔄 Fetching ${reportType} from Tally for ${companyId}/${divisionId}...`);
    
    // Get Tally URL from Supabase
    const tallyUrl = await getTallyUrl(companyId, divisionId);
    
    const requestXml = createTallyRequest(reportType, fromDate, toDate);
    
    const response = await axios.post(tallyUrl, requestXml, {
      headers: {
        'Content-Type': 'application/xml',
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    });
    
    console.log(`✅ Received response (${response.data.length} chars)`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching from Tally:', error.message);
    throw error;
  }
}

// Parse Tally XML response
async function parseTallyResponse(xmlData) {
  try {
    const result = await parser.parseStringPromise(xmlData);
    return result;
  } catch (error) {
    console.error('❌ Error parsing XML:', error.message);
    throw error;
  }
}

// Convert voucher to JSON (XQuery-like transformation)
function voucherToJson(voucher) {
  // Handle both DayBook and Vouchers Collection formats
  // DayBook uses 'LEDGERENTRIES.LIST' (with dot in property name), Vouchers Collection uses ALLLEDGERENTRIES.LIST
  const ledgerEntries = voucher['LEDGERENTRIES.LIST'] || voucher.ALLLEDGERENTRIES?.LIST || [];
  const inventoryEntries = voucher['INVENTORYENTRIES.LIST'] || voucher.ALLINVENTORYENTRIES?.LIST || [];
  
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

// Extract master data from Tally response
function extractMasterData(parsedData, dataType) {
  const items = [];
  
  const tallyMessages = parsedData.RESPONSE?.BODY?.DATA?.TALLYMESSAGE;
  if (!tallyMessages) return items;

  const messageList = Array.isArray(tallyMessages) ? tallyMessages : [tallyMessages];

  messageList.forEach(msg => {
    if (msg[dataType]) {
      const item = msg[dataType];
      items.push({
        GUID: normalize(item.GUID),
        NAME: normalize(item.NAME),
        PARENT: normalize(item.PARENT),
        ...(item.OPENINGBALANCE && { OPENINGBALANCE: parseFloat(normalize(item.OPENINGBALANCE) || 0) }),
        ...(item.BASEUNITS && { BASEUNITS: normalize(item.BASEUNITS) }),
        ...(item.ISREVENUE && { ISREVENUE: normalize(item.ISREVENUE) === 'Yes' })
      });
    }
  });
  
  return items;
}

// Extract vouchers from Tally response
function extractVouchers(parsedData) {
  const vouchers = [];
  console.log('🔍 Extracting vouchers from parsed data...');
  
  // Handle different response structures
  let dataSource = null;
  
  // Try different possible structures
  if (parsedData.ENVELOPE?.BODY?.DATA) {
    dataSource = parsedData.ENVELOPE.BODY.DATA;
    console.log('📋 Found data in ENVELOPE.BODY.DATA structure');
  } else if (parsedData.RESPONSE?.BODY?.DATA) {
    dataSource = parsedData.RESPONSE.BODY.DATA;
    console.log('📋 Found data in RESPONSE.BODY.DATA structure');
  } else if (parsedData.DAYBOOK) {
    dataSource = { DAYBOOK: parsedData.DAYBOOK };
    console.log('📋 Found data in DAYBOOK structure');
  } else if (parsedData.TALLYMESSAGE) {
    dataSource = { TALLYMESSAGE: parsedData.TALLYMESSAGE };
    console.log('📋 Found data in TALLYMESSAGE structure');
  }
  
  if (!dataSource) {
    console.warn('⚠️ No recognizable data structure found in response');
    console.log('Available keys:', Object.keys(parsedData));
    return vouchers;
  }
  
  // Process DAYBOOK structure (from our TDL)
  if (dataSource.DAYBOOK && dataSource.DAYBOOK.VOUCHER) {
    console.log('📊 Processing DAYBOOK vouchers...');
    const voucherArray = Array.isArray(dataSource.DAYBOOK.VOUCHER) ? 
      dataSource.DAYBOOK.VOUCHER : [dataSource.DAYBOOK.VOUCHER];
    
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
    
    console.log(`✅ Extracted ${vouchers.length} vouchers from DAYBOOK`);
    return vouchers;
  }
  
  // Process standard Tally TALLYMESSAGE structure
  if (dataSource.TALLYMESSAGE) {
    console.log('📊 Processing standard Tally TALLYMESSAGE vouchers...');
    const messageArray = Array.isArray(dataSource.TALLYMESSAGE) ? dataSource.TALLYMESSAGE : [dataSource.TALLYMESSAGE];
    
    messageArray.forEach(message => {
      if (message.VOUCHER) {
        const voucherArray = Array.isArray(message.VOUCHER) ? message.VOUCHER : [message.VOUCHER];
        
        voucherArray.forEach(voucher => {
          // Extract basic voucher information
          const voucherData = {
            GUID: normalize(voucher.GUID),
            VOUCHERNUMBER: normalize(voucher.VOUCHERNUMBER),
            VOUCHERTYPENAME: normalize(voucher.VOUCHERTYPENAME),
            DATE: normalize(voucher.DATE),
            PARTYLEDGERNAME: normalize(voucher.PARTYLEDGERNAME),
            NARRATION: normalize(voucher.NARRATION),
            AMOUNT: parseFloat(normalize(voucher.AMOUNT) || 0),
            ISINVOICE: normalize(voucher.ISINVOICE) === 'Yes',
            ISACCOUNTING: normalize(voucher.ISACCOUNTING) === 'Yes',
            ISINVENTORY: normalize(voucher.ISINVENTORY) === 'Yes',
            entries: [],
            inventoryEntries: []
          };
          
          // Extract ledger entries if available
          if (voucher.ALLLEDGERENTRIES?.LIST) {
            const ledgerEntries = Array.isArray(voucher.ALLLEDGERENTRIES.LIST) ? 
              voucher.ALLLEDGERENTRIES.LIST : [voucher.ALLLEDGERENTRIES.LIST];
            
            voucherData.entries = ledgerEntries.map(entry => ({
              LEDGERNAME: normalize(entry.LEDGERNAME),
              AMOUNT: parseFloat(normalize(entry.AMOUNT) || 0),
              ISDEEMEDPOSITIVE: normalize(entry.ISDEEMEDPOSITIVE) === 'Yes'
            }));
          }
          
          // Extract inventory entries if available
          if (voucher.ALLINVENTORYENTRIES?.LIST) {
            const inventoryEntries = Array.isArray(voucher.ALLINVENTORYENTRIES.LIST) ? 
              voucher.ALLINVENTORYENTRIES.LIST : [voucher.ALLINVENTORYENTRIES.LIST];
            
            voucherData.inventoryEntries = inventoryEntries.map(entry => ({
              STOCKITEMNAME: normalize(entry.STOCKITEMNAME),
              ACTUALQTY: parseFloat(normalize(entry.ACTUALQTY) || 0),
              RATE: parseFloat(normalize(entry.RATE) || 0),
              AMOUNT: parseFloat(normalize(entry.AMOUNT) || 0),
              GODOWNNAME: normalize(entry.GODOWNNAME)
            }));
          }
          
          vouchers.push(voucherData);
        });
      }
    });
    
    console.log(`✅ Extracted ${vouchers.length} vouchers from TALLYMESSAGE`);
    return vouchers;
  }
  
  // Legacy processing for other structures
  if (dataSource.DATA) {
    console.log('📊 Processing legacy DATA structure...');
    const dataArray = Array.isArray(dataSource.DATA) ? dataSource.DATA : [dataSource.DATA];
    
    dataArray.forEach(data => {
      if (data.TALLYMESSAGE) {
        const messages = Array.isArray(data.TALLYMESSAGE) ? data.TALLYMESSAGE : [data.TALLYMESSAGE];
        messages.forEach(message => {
          if (message.VOUCHER) {
            const voucherList = Array.isArray(message.VOUCHER) ? message.VOUCHER : [message.VOUCHER];
            voucherList.forEach(voucher => {
              vouchers.push(voucher);
            });
          }
        });
      }
    });
  }
  
  return vouchers;
}

// API Routes

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Tally XML API is running - Database Service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: NODE_ENV,
      service: 'Database - Data Serving',
      storage: {
        totalVouchers: xmlStorage.size,
        companies: Array.from(new Set(Array.from(xmlStorage.keys()).map(k => k.split('/')[0]))),
        masterData: {
          ledgers: masterDataStorage.ledgers.size,
          groups: masterDataStorage.groups.size,
          stockItems: masterDataStorage.stockItems.size,
          voucherTypes: masterDataStorage.voucherTypes.size,
          units: masterDataStorage.units.size,
          godowns: masterDataStorage.godowns.size
        }
      }
    }
  });
});

// Clear storage endpoint for testing
app.post('/api/v1/clear', (req, res) => {
  xmlStorage.clear();
  res.json({
    success: true,
    message: 'Storage cleared successfully',
    timestamp: new Date().toISOString()
  });
});

// Get vouchers with filtering
app.get('/api/v1/vouchers/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { from, to, type, search, page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // Get all vouchers for this company/division
    const allVouchers = Array.from(xmlStorage.values())
      .filter(voucher => {
        const key = voucher.key;
        return key.startsWith(`${companyId}/${divisionId}/`);
      })
      .map(v => v.data);
    
    // Apply filters
    let filteredVouchers = allVouchers;
    
    if (from || to) {
      filteredVouchers = filteredVouchers.filter(voucher => {
        const date = voucher.DATE;
        if (!date) return false;
        
        // Handle DD-MMM-YY format (e.g., "2-Jun-25")
        let voucherDate;
        try {
          if (date.includes('-') && date.includes('25')) {
            // Parse DD-MMM-YY format
            const parts = date.split('-');
            const day = parts[0].padStart(2, '0');
            const monthMap = {
              'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
              'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            const month = monthMap[parts[1]] || '01';
            const year = '20' + parts[2]; // Convert 25 to 2025
            voucherDate = new Date(`${year}-${month}-${day}`);
          } else if (date.length === 8) {
            // Handle YYYYMMDD format (fallback)
            voucherDate = new Date(
              date.substring(0, 4) + '-' + 
              date.substring(4, 6) + '-' + 
              date.substring(6, 8)
            );
          } else {
            // Try direct parsing
            voucherDate = new Date(date);
          }
        } catch (error) {
          console.warn(`⚠️ Error parsing voucher date: ${date}`);
          return false;
        }
        
        if (isNaN(voucherDate.getTime())) {
          console.warn(`⚠️ Invalid voucher date: ${date}`);
          return false;
        }
        
        if (from) {
          const fromDate = new Date(from);
          if (voucherDate < fromDate) return false;
        }
        
        if (to) {
          const toDate = new Date(to);
          if (voucherDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    if (type) {
      filteredVouchers = filteredVouchers.filter(voucher => 
        voucher.VOUCHERTYPENAME?.includes(type)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredVouchers = filteredVouchers.filter(voucher => 
        voucher.VOUCHERNUMBER?.toLowerCase().includes(searchLower) ||
        voucher.NARRATION?.toLowerCase().includes(searchLower) ||
        voucher.PARTYLEDGERNAME?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by date descending, then by voucher number
    filteredVouchers.sort((a, b) => {
      const dateA = a.DATE || '';
      const dateB = b.DATE || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.VOUCHERNUMBER || '').localeCompare(a.VOUCHERNUMBER || '');
    });
    
    const total = filteredVouchers.length;
    const paginatedVouchers = filteredVouchers.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        vouchers: paginatedVouchers.map(voucherToJson)
      }
    });
    
  } catch (error) {
    console.error('Error getting vouchers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single voucher
app.get('/api/v1/voucher/:companyId/:divisionId/:voucherId', (req, res) => {
  try {
    const { companyId, divisionId, voucherId } = req.params;
    
    const key = `${companyId}/${divisionId}/${voucherId}`;
    const stored = xmlStorage.get(key);
    
    if (!stored) {
      return res.status(404).json({
        success: false,
        error: 'Voucher not found'
      });
    }
    
    res.json({
      success: true,
      data: voucherToJson(stored.data)
    });
    
  } catch (error) {
    console.error('Error getting voucher:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update voucher
app.put('/api/v1/voucher/:companyId/:divisionId/:voucherId', (req, res) => {
  try {
    const { companyId, divisionId, voucherId } = req.params;
    const updates = req.body;
    
    const key = `${companyId}/${divisionId}/${voucherId}`;
    const stored = xmlStorage.get(key);
    
    if (!stored) {
      return res.status(404).json({
        success: false,
        error: 'Voucher not found'
      });
    }
    
    // Apply updates to the XML data
    if (updates.narration) {
      stored.data.NARRATION = updates.narration;
    }
    
    if (updates.entries) {
      updates.entries.forEach(entry => {
        const index = entry.index - 1;
        if (stored.data.ALLLEDGERENTRIES?.LIST?.[index]) {
          if (entry.amount !== undefined) {
            stored.data.ALLLEDGERENTRIES.LIST[index].AMOUNT = entry.amount.toString();
          }
          if (entry.ledgerName) {
            stored.data.ALLLEDGERENTRIES.LIST[index].LEDGERNAME = entry.ledgerName;
          }
        }
      });
    }
    
    if (updates.inventoryEntries) {
      updates.inventoryEntries.forEach(entry => {
        const index = entry.index - 1;
        if (stored.data.ALLINVENTORYENTRIES?.LIST?.[index]) {
          if (entry.rate !== undefined) {
            stored.data.ALLINVENTORYENTRIES.LIST[index].RATE = entry.rate.toString();
          }
          if (entry.amount !== undefined) {
            stored.data.ALLINVENTORYENTRIES.LIST[index].AMOUNT = entry.amount.toString();
          }
          if (entry.billedQuantity !== undefined) {
            stored.data.ALLINVENTORYENTRIES.LIST[index].BILLEDQTY = entry.billedQuantity.toString();
          }
        }
      });
    }
    
    // Update timestamp
    stored.updatedAt = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Voucher updated successfully',
      data: voucherToJson(stored.data)
    });
    
  } catch (error) {
    console.error('Error updating voucher:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Comprehensive sync endpoint for all Tally data
app.post('/api/v1/sync-comprehensive/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { fromDate = '20200101', toDate = '20251231' } = req.body;
    
    console.log(`🔄 Starting comprehensive sync for ${companyId}/${divisionId}...`);
    
    const results = {
      vouchers: { total: 0, stored: 0, errors: 0 },
      masterData: {
        ledgers: 0,
        groups: 0,
        stockItems: 0,
        voucherTypes: 0,
        units: 0,
        godowns: 0
      },
      errors: []
    };

    // 1. Sync detailed vouchers
    console.log('📋 Syncing detailed vouchers...');
    try {
      const voucherXml = await fetchTallyData(companyId, divisionId, 'Vouchers', fromDate, toDate);
      const parsedVouchers = await parseTallyResponse(voucherXml);
      const vouchers = extractVouchers(parsedVouchers);
      
      console.log(`📋 Found ${vouchers.length} detailed vouchers`);
      
      // Store vouchers with detailed information
      let storedCount = 0;
      vouchers.forEach(voucher => {
        const voucherId = voucher.ALTERID || voucher.$?.VCHKEY || 'unknown';
        const key = `${companyId}/${divisionId}/${voucherId}`;
        
        xmlStorage.set(key, {
          key,
          data: voucher,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'tally-comprehensive'
        });
        
        storedCount++;
      });
      
      results.vouchers.total = vouchers.length;
      results.vouchers.stored = storedCount;
      console.log(`✅ Stored ${storedCount} detailed vouchers`);
      
    } catch (error) {
      console.error('❌ Voucher sync failed:', error.message);
      results.vouchers.errors++;
      results.errors.push(`Voucher sync: ${error.message}`);
    }

    // 2. Sync master data
    console.log('📊 Syncing master data...');
    
    // Sync Ledgers
    try {
      const ledgerXml = await fetchTallyData(companyId, divisionId, 'Ledger');
      const parsedLedgers = await parseTallyResponse(ledgerXml);
      const ledgers = extractMasterData(parsedLedgers, 'LEDGER');
      
      ledgers.forEach(ledger => {
        const key = `${companyId}/${divisionId}/ledger/${ledger.GUID}`;
        masterDataStorage.ledgers.set(key, {
          key,
          data: ledger,
          createdAt: new Date().toISOString(),
          source: 'tally'
        });
      });
      
      results.masterData.ledgers = ledgers.length;
      console.log(`✅ Stored ${ledgers.length} ledgers`);
    } catch (error) {
      console.error('❌ Ledger sync failed:', error.message);
      results.errors.push(`Ledger sync: ${error.message}`);
    }

    // Sync Groups
    try {
      const groupXml = await fetchTallyData(companyId, divisionId, 'Group');
      const parsedGroups = await parseTallyResponse(groupXml);
      const groups = extractMasterData(parsedGroups, 'GROUP');
      
      groups.forEach(group => {
        const key = `${companyId}/${divisionId}/group/${group.GUID}`;
        masterDataStorage.groups.set(key, {
          key,
          data: group,
          createdAt: new Date().toISOString(),
          source: 'tally'
        });
      });
      
      results.masterData.groups = groups.length;
      console.log(`✅ Stored ${groups.length} groups`);
    } catch (error) {
      console.error('❌ Group sync failed:', error.message);
      results.errors.push(`Group sync: ${error.message}`);
    }

    // Sync Stock Items
    try {
      const stockXml = await fetchTallyData(companyId, divisionId, 'StockItem');
      const parsedStock = await parseTallyResponse(stockXml);
      const stockItems = extractMasterData(parsedStock, 'STOCKITEM');
      
      stockItems.forEach(item => {
        const key = `${companyId}/${divisionId}/stock/${item.GUID}`;
        masterDataStorage.stockItems.set(key, {
          key,
          data: item,
          createdAt: new Date().toISOString(),
          source: 'tally'
        });
      });
      
      results.masterData.stockItems = stockItems.length;
      console.log(`✅ Stored ${stockItems.length} stock items`);
    } catch (error) {
      console.error('❌ Stock item sync failed:', error.message);
      results.errors.push(`Stock item sync: ${error.message}`);
    }

    // Sync Voucher Types
    try {
      const voucherTypeXml = await fetchTallyData(companyId, divisionId, 'VoucherType');
      const parsedTypes = await parseTallyResponse(voucherTypeXml);
      const voucherTypes = extractMasterData(parsedTypes, 'VOUCHERTYPE');
      
      voucherTypes.forEach(type => {
        const key = `${companyId}/${divisionId}/vouchertype/${type.GUID}`;
        masterDataStorage.voucherTypes.set(key, {
          key,
          data: type,
          createdAt: new Date().toISOString(),
          source: 'tally'
        });
      });
      
      results.masterData.voucherTypes = voucherTypes.length;
      console.log(`✅ Stored ${voucherTypes.length} voucher types`);
    } catch (error) {
      console.error('❌ Voucher type sync failed:', error.message);
      results.errors.push(`Voucher type sync: ${error.message}`);
    }

    console.log(`🎉 Comprehensive sync completed!`);
    console.log(`📊 Results: ${results.vouchers.stored} vouchers, ${Object.values(results.masterData).reduce((a, b) => a + b, 0)} master data items`);

    res.json({
      success: true,
      message: 'Comprehensive sync completed successfully',
      data: {
        ...results,
        companyId,
        divisionId,
        dateRange: { fromDate, toDate },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Comprehensive sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Comprehensive sync failed'
    });
  }
});

// [DEPRECATED] Sync data from Tally - Use /api/v1/tallysync/sync instead
app.post('/api/v1/sync/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    
    console.log(`🔄 Syncing ALL vouchers for ${companyId}/${divisionId} (no date filtering)`);
    
    // Fetch data from Tally - try Vouchers Collection first for detailed data
    let xmlData;
    try {
      console.log('🔄 Trying Vouchers Collection for detailed data...');
      xmlData = await fetchTallyData(companyId, divisionId, 'Vouchers', '', '');
    } catch (error) {
      console.log('⚠️ Vouchers Collection failed, falling back to DayBook...');
      xmlData = await fetchTallyData(companyId, divisionId, 'DayBook', '', '');
    }
    const parsedData = await parseTallyResponse(xmlData);
    const vouchers = extractVouchers(parsedData);
    
    console.log(`📋 Found ${vouchers.length} vouchers`);
    
    let storedCount = 0;
    let errorCount = 0;
    
    // Store each voucher
    for (const voucher of vouchers) {
      try {
        const voucherId = voucher.ALTERID || voucher.$?.VCHKEY || 'unknown';
        const key = `${companyId}/${divisionId}/${voucherId}`;
        
        xmlStorage.set(key, {
          key,
          data: voucher,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'tally'
        });
        
        storedCount++;
        
      } catch (error) {
        console.error(`Error storing voucher ${voucherId}:`, error.message);
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: {
        totalVouchers: vouchers.length,
        storedVouchers: storedCount,
        errorCount,
        companyId,
        divisionId,
        syncType: 'ALL_VOUCHERS'
      }
    });
    
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get voucher as XML (for Tally import)
app.get('/api/v1/voucher/:companyId/:divisionId/:voucherId/xml', (req, res) => {
  try {
    const { companyId, divisionId, voucherId } = req.params;
    
    const key = `${companyId}/${divisionId}/${voucherId}`;
    const stored = xmlStorage.get(key);
    
    if (!stored) {
      return res.status(404).json({
        success: false,
        error: 'Voucher not found'
      });
    }
    
    // Create Tally import envelope
    const envelope = {
      ENVELOPE: {
        HEADER: {
          VERSION: '1',
          TALLYREQUEST: 'Import',
          TYPE: 'Data',
          ID: 'Voucher'
        },
        BODY: {
          DESC: {
            STATICVARIABLES: {
              SVEXPORTFORMAT: '$$SysName:XML'
            }
          },
          DATA: {
            TALLYMESSAGE: {
              VOUCHER: stored.data
            }
          }
        }
      }
    };
    
    const xml = builder.buildObject(envelope);
    
    res.set('Content-Type', 'application/xml');
    res.send(xml);
    
  } catch (error) {
    console.error('Error getting voucher XML:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Tally XML API - Single Source of Truth for Tally Data',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/v1/health',
      sync: 'POST /api/v1/sync/{companyId}/{divisionId}',
      vouchers: 'GET /api/v1/vouchers/{companyId}/{divisionId}',
      voucher: 'GET /api/v1/voucher/{companyId}/{divisionId}/{voucherId}',
      updateVoucher: 'PUT /api/v1/voucher/{companyId}/{divisionId}/{voucherId}',
      exportXML: 'GET /api/v1/voucher/{companyId}/{divisionId}/{voucherId}/xml'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Master Data Endpoints - Serve from Database
app.get('/api/v1/ledgers/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // Get ledgers from database
    const allLedgers = Array.from(masterDataStorage.ledgers.values())
      .filter(ledger => {
        const key = ledger.key;
        return key.startsWith(`${companyId}/${divisionId}/ledger/`);
      })
      .map(l => l.data);
    
    // Apply search filter
    let filteredLedgers = allLedgers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLedgers = allLedgers.filter(ledger => 
        ledger.NAME?.toLowerCase().includes(searchLower) ||
        ledger.PARENT?.toLowerCase().includes(searchLower)
      );
    }
    
    const total = filteredLedgers.length;
    const paginatedLedgers = filteredLedgers.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        ledgers: paginatedLedgers,
        service: 'Database - Data Serving'
      }
    });
    
  } catch (error) {
    console.error('Error fetching ledgers from database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v1/groups/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // Get groups from database
    const allGroups = Array.from(masterDataStorage.groups.values())
      .filter(group => {
        const key = group.key;
        return key.startsWith(`${companyId}/${divisionId}/group/`);
      })
      .map(g => g.data);
    
    // Apply search filter
    let filteredGroups = allGroups;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredGroups = allGroups.filter(group => 
        group.NAME?.toLowerCase().includes(searchLower) ||
        group.PARENT?.toLowerCase().includes(searchLower)
      );
    }
    
    const total = filteredGroups.length;
    const paginatedGroups = filteredGroups.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        groups: paginatedGroups,
        service: 'Database - Data Serving'
      }
    });
    
  } catch (error) {
    console.error('Error fetching groups from database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v1/stock-items/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // Get stock items from database
    const allStockItems = Array.from(masterDataStorage.stockItems.values())
      .filter(item => {
        const key = item.key;
        return key.startsWith(`${companyId}/${divisionId}/stock/`);
      })
      .map(i => i.data);
    
    // Apply search filter
    let filteredItems = allStockItems;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = allStockItems.filter(item => 
        item.NAME?.toLowerCase().includes(searchLower) ||
        item.PARENT?.toLowerCase().includes(searchLower)
      );
    }
    
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        stockItems: paginatedItems,
        service: 'Database - Data Serving'
      }
    });
    
  } catch (error) {
    console.error('Error fetching stock items from database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v1/voucher-types/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { page = 1, limit = 50, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // Get voucher types from database
    const allVoucherTypes = Array.from(masterDataStorage.voucherTypes.values())
      .filter(type => {
        const key = type.key;
        return key.startsWith(`${companyId}/${divisionId}/vouchertype/`);
      })
      .map(t => t.data);
    
    // Apply search filter
    let filteredTypes = allVoucherTypes;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTypes = allVoucherTypes.filter(type => 
        type.NAME?.toLowerCase().includes(searchLower)
      );
    }
    
    const total = filteredTypes.length;
    const paginatedTypes = filteredTypes.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        voucherTypes: paginatedTypes,
        service: 'Database - Data Serving'
      }
    });
    
  } catch (error) {
    console.error('Error fetching voucher types from database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// TALLYSYNC APIs - For Data Population
// ========================================

// TallySync: Health check with database stats
app.get('/api/v1/tallysync/health', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'TallySync API is running - Data Population Service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: NODE_ENV,
      storage: {
        totalVouchers: xmlStorage.size,
        companies: Array.from(new Set(Array.from(xmlStorage.keys()).map(k => k.split('/')[0]))),
        masterData: {
          ledgers: masterDataStorage.ledgers.size,
          groups: masterDataStorage.groups.size,
          stockItems: masterDataStorage.stockItems.size,
          voucherTypes: masterDataStorage.voucherTypes.size,
          units: masterDataStorage.units.size,
          godowns: masterDataStorage.godowns.size
        }
      }
    }
  });
});

// TallySync: Comprehensive sync from Tally to Database
app.post('/api/v1/tallysync/sync-comprehensive/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { fromDate = '20200101', toDate = '20251231' } = req.body;
    
    console.log(`🔄 TallySync: Starting comprehensive sync for ${companyId}/${divisionId}...`);
    
    const results = {
      vouchers: { total: 0, stored: 0, errors: 0 },
      masterData: {
        ledgers: 0,
        groups: 0,
        stockItems: 0,
        voucherTypes: 0,
        units: 0,
        godowns: 0
      },
      errors: []
    };

    // 1. Sync detailed vouchers
    console.log('📋 TallySync: Syncing detailed vouchers...');
    try {
      const voucherXml = await fetchTallyData(companyId, divisionId, 'Vouchers', fromDate, toDate);
      const parsedVouchers = await parseTallyResponse(voucherXml);
      const vouchers = extractVouchers(parsedVouchers);
      
      console.log(`📋 TallySync: Found ${vouchers.length} detailed vouchers`);
      
      // Store vouchers in database
      let storedCount = 0;
      vouchers.forEach(voucher => {
        const voucherId = voucher.ALTERID || voucher.$?.VCHKEY || 'unknown';
        const key = `${companyId}/${divisionId}/${voucherId}`;
        
        xmlStorage.set(key, {
          key,
          data: voucher,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'tallysync-comprehensive'
        });
        
        storedCount++;
      });
      
      results.vouchers.total = vouchers.length;
      results.vouchers.stored = storedCount;
      console.log(`✅ TallySync: Stored ${storedCount} detailed vouchers`);
      
    } catch (error) {
      console.error('❌ TallySync: Voucher sync failed:', error.message);
      results.vouchers.errors++;
      results.errors.push(`Voucher sync: ${error.message}`);
    }

    // 2. Sync master data
    console.log('📊 TallySync: Syncing master data...');
    
    // Sync Ledgers
    try {
      const ledgerXml = await fetchTallyData(companyId, divisionId, 'Ledger');
      const parsedLedgers = await parseTallyResponse(ledgerXml);
      const ledgers = extractMasterData(parsedLedgers, 'LEDGER');
      
      ledgers.forEach(ledger => {
        const key = `${companyId}/${divisionId}/ledger/${ledger.GUID}`;
        masterDataStorage.ledgers.set(key, {
          key,
          data: ledger,
          createdAt: new Date().toISOString(),
          source: 'tallysync'
        });
      });
      
      results.masterData.ledgers = ledgers.length;
      console.log(`✅ TallySync: Stored ${ledgers.length} ledgers`);
    } catch (error) {
      console.error('❌ TallySync: Ledger sync failed:', error.message);
      results.errors.push(`Ledger sync: ${error.message}`);
    }

    // Sync Groups
    try {
      const groupXml = await fetchTallyData(companyId, divisionId, 'Group');
      const parsedGroups = await parseTallyResponse(groupXml);
      const groups = extractMasterData(parsedGroups, 'GROUP');
      
      groups.forEach(group => {
        const key = `${companyId}/${divisionId}/group/${group.GUID}`;
        masterDataStorage.groups.set(key, {
          key,
          data: group,
          createdAt: new Date().toISOString(),
          source: 'tallysync'
        });
      });
      
      results.masterData.groups = groups.length;
      console.log(`✅ TallySync: Stored ${groups.length} groups`);
    } catch (error) {
      console.error('❌ TallySync: Group sync failed:', error.message);
      results.errors.push(`Group sync: ${error.message}`);
    }

    // Sync Stock Items
    try {
      const stockXml = await fetchTallyData(companyId, divisionId, 'StockItem');
      const parsedStock = await parseTallyResponse(stockXml);
      const stockItems = extractMasterData(parsedStock, 'STOCKITEM');
      
      stockItems.forEach(item => {
        const key = `${companyId}/${divisionId}/stock/${item.GUID}`;
        masterDataStorage.stockItems.set(key, {
          key,
          data: item,
          createdAt: new Date().toISOString(),
          source: 'tallysync'
        });
      });
      
      results.masterData.stockItems = stockItems.length;
      console.log(`✅ TallySync: Stored ${stockItems.length} stock items`);
    } catch (error) {
      console.error('❌ TallySync: Stock item sync failed:', error.message);
      results.errors.push(`Stock item sync: ${error.message}`);
    }

    // Sync Voucher Types
    try {
      const voucherTypeXml = await fetchTallyData(companyId, divisionId, 'VoucherType');
      const parsedTypes = await parseTallyResponse(voucherTypeXml);
      const voucherTypes = extractMasterData(parsedTypes, 'VOUCHERTYPE');
      
      voucherTypes.forEach(type => {
        const key = `${companyId}/${divisionId}/vouchertype/${type.GUID}`;
        masterDataStorage.voucherTypes.set(key, {
          key,
          data: type,
          createdAt: new Date().toISOString(),
          source: 'tallysync'
        });
      });
      
      results.masterData.voucherTypes = voucherTypes.length;
      console.log(`✅ TallySync: Stored ${voucherTypes.length} voucher types`);
    } catch (error) {
      console.error('❌ TallySync: Voucher type sync failed:', error.message);
      results.errors.push(`Voucher type sync: ${error.message}`);
    }

    console.log(`🎉 TallySync: Comprehensive sync completed!`);
    console.log(`📊 TallySync Results: ${results.vouchers.stored} vouchers, ${Object.values(results.masterData).reduce((a, b) => a + b, 0)} master data items`);

    res.json({
      success: true,
      message: 'TallySync comprehensive sync completed successfully',
      data: {
        ...results,
        companyId,
        divisionId,
        dateRange: { fromDate, toDate },
        timestamp: new Date().toISOString(),
        service: 'TallySync - Data Population'
      }
    });

  } catch (error) {
    console.error('❌ TallySync: Comprehensive sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'TallySync comprehensive sync failed'
    });
  }
});

// TallySync: Sync vouchers from Tally to Database
app.post('/api/v1/tallysync/sync/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    
    console.log(`🔄 TallySync: Syncing ALL vouchers for ${companyId}/${divisionId} (no date filtering)`);
    
    // Fetch data from Tally - try Vouchers Collection first for detailed data
    let xmlData;
    try {
      console.log('🔄 TallySync: Trying Vouchers Collection for detailed data...');
      xmlData = await fetchTallyData(companyId, divisionId, 'Vouchers', '', '');
    } catch (error) {
      console.log('⚠️ TallySync: Vouchers Collection failed, falling back to DayBook...');
      xmlData = await fetchTallyData(companyId, divisionId, 'DayBook', '', '');
    }
    const parsedData = await parseTallyResponse(xmlData);
    const vouchers = extractVouchers(parsedData);
    
    console.log(`📋 TallySync: Found ${vouchers.length} vouchers`);
    
    let storedCount = 0;
    let errorCount = 0;
    
    // Store each voucher in database
    for (const voucher of vouchers) {
      try {
        const voucherId = voucher.ALTERID || voucher.$?.VCHKEY || 'unknown';
        const key = `${companyId}/${divisionId}/${voucherId}`;
        
        xmlStorage.set(key, {
          key,
          data: voucher,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'tallysync'
        });
        
        storedCount++;
        
      } catch (error) {
        console.error(`❌ TallySync: Error storing voucher:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ TallySync: Stored ${storedCount} vouchers. Total in database: ${xmlStorage.size}`);
    
    res.json({
      success: true,
      message: 'TallySync voucher sync completed successfully',
      data: {
        totalVouchers: vouchers.length,
        storedVouchers: storedCount,
        errorCount,
        companyId,
        divisionId,
        service: 'TallySync - Data Population'
      }
    });
    
  } catch (error) {
    console.error('❌ TallySync: Sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'TallySync voucher sync failed'
    });
  }
});

// TallySync: Debug endpoint to test XML request generation
app.get('/api/v1/tallysync/debug/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    
    console.log(`🔧 Debug: Testing Tally connection for ${companyId}/${divisionId}`);
    
    // Get Tally URL
    let tallyUrl;
    try {
      tallyUrl = await getTallyUrl(companyId, divisionId);
      console.log(`✅ Debug: Found Tally URL: ${tallyUrl}`);
    } catch (error) {
      console.error(`❌ Debug: Tally URL error: ${error.message}`);
      return res.json({
        success: false,
        debug: {
          step: 'getTallyUrl',
          error: error.message,
          companyId,
          divisionId
        }
      });
    }
    
    // Generate XML request
    const xmlRequest = createTallyRequest('DayBook', '20250901', '20250930');
    console.log(`📤 Debug: Generated XML request (length: ${xmlRequest.length})`);
    
    // Test the actual HTTP request to Tally
    try {
      console.log(`🔄 Debug: Sending request to ${tallyUrl}`);
      
      const response = await axios.post(tallyUrl, xmlRequest, {
        headers: {
          'Content-Type': 'application/xml',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 10000
      });
      
      console.log(`✅ Debug: Received response (${response.data.length} chars)`);
      console.log(`📋 Debug: Response preview: ${response.data.substring(0, 500)}...`);
      
      // Parse the response
      const parsedData = await parseTallyResponse(response.data);
      console.log(`📊 Debug: Parsed data keys: ${Object.keys(parsedData)}`);
      
      // Extract vouchers
      const vouchers = extractVouchers(parsedData);
      console.log(`📋 Debug: Extracted ${vouchers.length} vouchers`);
      
      res.json({
        success: true,
        debug: {
          tallyUrl,
          xmlRequestLength: xmlRequest.length,
          responseLength: response.data.length,
          responsePreview: response.data.substring(0, 500),
          parsedDataKeys: Object.keys(parsedData),
          vouchersExtracted: vouchers.length,
          sampleVouchers: vouchers.slice(0, 3),
          service: 'TallySync - Debug'
        }
      });
      
    } catch (error) {
      console.error(`❌ Debug: HTTP request error: ${error.message}`);
      res.json({
        success: false,
        debug: {
          step: 'httpRequest',
          error: error.message,
          tallyUrl,
          xmlRequestPreview: xmlRequest.substring(0, 500),
          service: 'TallySync - Debug'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      debug: {
        step: 'general',
        error: error.message,
        service: 'TallySync - Debug'
      }
    });
  }
});

// TallySync: Clear database (for testing)
app.post('/api/v1/tallysync/clear', (req, res) => {
  const voucherCount = xmlStorage.size;
  const masterDataCount = Object.values(masterDataStorage).reduce((acc, storage) => acc + storage.size, 0);
  
  xmlStorage.clear();
  Object.values(masterDataStorage).forEach(storage => storage.clear());
  
  console.log(`🗑️ TallySync: Cleared ${voucherCount} vouchers and ${masterDataCount} master data items`);
  
  res.json({
    success: true,
    message: 'TallySync database cleared successfully',
    data: {
      clearedVouchers: voucherCount,
      clearedMasterData: masterDataCount,
      service: 'TallySync - Data Population'
    }
  });
});

// ========================================
// END TALLYSYNC APIs
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tally XML API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🔄 Sync endpoint: POST http://localhost:${PORT}/api/v1/sync/{companyId}/{divisionId}`);
  console.log(`📋 Vouchers: GET http://localhost:${PORT}/api/v1/vouchers/{companyId}/{divisionId}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Tally URLs: Fetched dynamically from Supabase per division`);
  console.log(`✅ Ledger entries parsing: FIXED - Using voucher['LEDGERENTRIES.LIST']`);
});

module.exports = app;
