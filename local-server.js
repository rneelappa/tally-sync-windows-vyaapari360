const express = require('express');
const cors = require('cors');
const LocalDatabase = require('./local-database');
const localConfig = require('./local-config.json');

const app = express();
const PORT = localConfig.server.port || 3000;
const db = new LocalDatabase(localConfig);

console.log('🚀 Starting Local Tally Sync Server...');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
async function initializeDatabase() {
  try {
    await db.connect();
    await db.createTables();
    console.log('✅ Local database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Local Tally Sync Server is running',
    data: {
      service: 'Local Development Server',
      timestamp: new Date().toISOString(),
      database: 'SQLite Local',
      version: '1.0.0'
    }
  });
});

// Bulk sync endpoint for batch data operations
app.post('/api/v1/bulk-sync/:companyId/:divisionId', async (req, res) => {
  console.log(`🔄 Local bulk sync request for ${req.params.companyId}/${req.params.divisionId}`);
  
  try {
    const { table, data, sync_type, batch_info, metadata } = req.body;
    
    if (!table || !data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: table and data array are required'
      });
    }
    
    console.log(`📊 Processing ${data.length} records for table: ${table}`);
    console.log(`🔧 Sync type: ${sync_type || 'full'}`);
    
    // Map table names
    const tableMapping = {
      'groups': 'groups',
      'ledgers': 'ledgers',
      'stock_items': 'stock_items',
      'voucher_types': 'voucher_types',
      'units': 'units',
      'godowns': 'godowns',
      'vouchers': 'vouchers',
      'accounting_entries': 'accounting_entries',
      'inventory_entries': 'inventory_entries'
    };
    
    const dbTable = tableMapping[table];
    if (!dbTable) {
      return res.status(400).json({
        success: false,
        error: `Unknown table: ${table}`
      });
    }
    
    // Add company and division info to each record
    const enrichedData = data.map(record => ({
      ...record,
      company_id: req.params.companyId,
      division_id: req.params.divisionId,
      sync_timestamp: new Date().toISOString(),
      source: 'tally'
    }));
    
    // Process data in batches
    const batchSize = 100;
    const results = [];
    let totalProcessed = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < enrichedData.length; i += batchSize) {
      const batch = enrichedData.slice(i, i + batchSize);
      
      try {
        const result = await db.upsert(dbTable, batch);
        totalProcessed += result.processed;
        totalErrors += result.errors;
        
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${result.processed} processed, ${result.errors} errors`);
        
        results.push({
          batch: Math.floor(i/batchSize) + 1,
          records: batch.length,
          processed: result.processed,
          errors: result.errors,
          success: result.errors === 0
        });
        
      } catch (batchError) {
        console.error(`❌ Batch processing error:`, batchError);
        totalErrors += batch.length;
        results.push({
          batch: Math.floor(i/batchSize) + 1,
          records: batch.length,
          processed: 0,
          errors: batch.length,
          success: false,
          error: batchError.message
        });
      }
    }
    
    // Update sync metadata
    const syncMetadata = {
      company_id: req.params.companyId,
      division_id: req.params.divisionId,
      table_name: table,
      last_sync: new Date().toISOString(),
      sync_type: sync_type || 'full',
      records_processed: totalProcessed,
      records_failed: totalErrors,
      metadata: metadata || {}
    };
    
    try {
      await db.updateSyncMetadata(syncMetadata);
    } catch (metadataError) {
      console.error('⚠️ Failed to update sync metadata:', metadataError);
    }
    
    console.log(`✅ Local bulk sync completed: ${totalProcessed} processed, ${totalErrors} errors`);
    
    res.json({
      success: true,
      message: `Local bulk sync completed for ${table}`,
      data: {
        table: table,
        total_records: data.length,
        processed: totalProcessed,
        failed: totalErrors,
        batches: results.length,
        sync_type: sync_type || 'full',
        company_id: req.params.companyId,
        division_id: req.params.divisionId,
        timestamp: new Date().toISOString()
      },
      batch_results: results
    });
    
  } catch (error) {
    console.error('❌ Local bulk sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during local bulk sync',
      details: error.message
    });
  }
});

// Metadata endpoint for sync tracking
app.get('/api/v1/metadata/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    
    console.log(`📋 Fetching local sync metadata for ${companyId}/${divisionId}`);
    
    const metadata = await db.getMetadata(companyId, divisionId);
    
    // Convert to the format expected by Tally sync
    const response = {
      company_id: companyId,
      division_id: divisionId,
      last_alter_id_master: 0,
      last_alter_id_transaction: 0,
      tables: {}
    };
    
    if (metadata && metadata.length > 0) {
      metadata.forEach(item => {
        response.tables[item.table_name] = {
          last_sync: item.last_sync,
          sync_type: item.sync_type,
          records_processed: item.records_processed,
          records_failed: item.records_failed
        };
        
        // Extract AlterIDs if available
        if (item.metadata && item.metadata.last_alter_id_master) {
          response.last_alter_id_master = Math.max(response.last_alter_id_master, item.metadata.last_alter_id_master);
        }
        if (item.metadata && item.metadata.last_alter_id_transaction) {
          response.last_alter_id_transaction = Math.max(response.last_alter_id_transaction, item.metadata.last_alter_id_transaction);
        }
      });
    }
    
    res.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('❌ Local metadata endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Sync status endpoint
app.get('/api/v1/sync-status/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    
    const syncHistory = await db.getMetadata(companyId, divisionId);
    
    // Calculate summary statistics
    const summary = {
      total_tables: syncHistory?.length || 0,
      last_sync: syncHistory?.[0]?.last_sync || null,
      total_records_processed: syncHistory?.reduce((sum, item) => sum + (item.records_processed || 0), 0) || 0,
      total_records_failed: syncHistory?.reduce((sum, item) => sum + (item.records_failed || 0), 0) || 0,
      sync_health: 'healthy'
    };
    
    // Determine sync health
    if (summary.total_records_failed > summary.total_records_processed * 0.1) {
      summary.sync_health = 'warning';
    }
    if (summary.total_records_failed > summary.total_records_processed * 0.5) {
      summary.sync_health = 'critical';
    }
    
    res.json({
      success: true,
      data: {
        company_id: companyId,
        division_id: divisionId,
        summary,
        recent_syncs: syncHistory || []
      }
    });
    
  } catch (error) {
    console.error('❌ Local sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Database stats endpoint
app.get('/api/v1/stats/:companyId/:divisionId', async (req, res) => {
  try {
    const { companyId, divisionId } = req.params;
    
    const tables = ['groups', 'ledgers', 'stock_items', 'voucher_types', 'units', 'godowns', 'vouchers', 'accounting_entries', 'inventory_entries'];
    const stats = {};
    
    for (const table of tables) {
      try {
        const count = await db.getTableCount(table, companyId, divisionId);
        stats[table] = count;
      } catch (error) {
        stats[table] = 0;
      }
    }
    
    const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    res.json({
      success: true,
      data: {
        company_id: companyId,
        division_id: divisionId,
        table_counts: stats,
        total_records: totalRecords,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Local stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down local server...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down local server...');
  await db.close();
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, 'localhost', () => {
    console.log(`\n🚀 Local Tally Sync Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`📦 Bulk Sync: POST http://localhost:${PORT}/api/v1/bulk-sync/{companyId}/{divisionId}`);
    console.log(`📋 Metadata: GET http://localhost:${PORT}/api/v1/metadata/{companyId}/{divisionId}`);
    console.log(`📊 Sync Status: GET http://localhost:${PORT}/api/v1/sync-status/{companyId}/{divisionId}`);
    console.log(`📈 Stats: GET http://localhost:${PORT}/api/v1/stats/{companyId}/{divisionId}`);
    console.log(`\n🗄️ Database: SQLite (${localConfig.database.filename})`);
    console.log(`🎯 Ready for Tally sync from localhost:9000`);
    console.log(`\n🔧 To test: node local-tally-sync.js`);
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
