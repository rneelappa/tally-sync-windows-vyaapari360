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

// In-memory XML storage (for Railway - consider Redis for production)
const xmlStorage = new Map();

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

// Helper function to create Tally XML request
function createTallyRequest(reportType = 'DayBook', fromDate = '', toDate = '') {
  let requestXml = `<?xml version="1.0" encoding="utf-8"?>
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
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>`;

  if (fromDate && toDate) {
    requestXml += `
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>`;
  }

  // For Vouchers Collection, add additional parameters for detailed data
  if (reportType === 'Vouchers') {
    requestXml += `
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>`;
  }

  requestXml += `
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

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

// Extract vouchers from Tally response
function extractVouchers(parsedData) {
  const vouchers = [];
  const envelope = parsedData.ENVELOPE;
  
  if (envelope && envelope.BODY && envelope.BODY.DATA) {
    const dataArray = Array.isArray(envelope.BODY.DATA) ? envelope.BODY.DATA : [envelope.BODY.DATA];
    
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
    message: 'Tally XML API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV,
    storage: {
      totalVouchers: xmlStorage.size,
      companies: Array.from(new Set(Array.from(xmlStorage.keys()).map(k => k.split('/')[0])))
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

// Sync data from Tally
app.post('/api/v1/sync/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    const { fromDate = '20250901', toDate = '20250930' } = req.body;
    
    console.log(`🔄 Syncing data for ${companyId}/${divisionId} from ${fromDate} to ${toDate}`);
    
    // Fetch data from Tally - try Vouchers Collection first for detailed data
    let xmlData;
    try {
      console.log('🔄 Trying Vouchers Collection for detailed data...');
      xmlData = await fetchTallyData(companyId, divisionId, 'Vouchers', fromDate, toDate);
    } catch (error) {
      console.log('⚠️ Vouchers Collection failed, falling back to DayBook...');
      xmlData = await fetchTallyData(companyId, divisionId, 'DayBook', fromDate, toDate);
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
        dateRange: { fromDate, toDate }
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
