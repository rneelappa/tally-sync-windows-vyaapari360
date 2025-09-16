# 🚀 Railway Deployment Guide - New Bulk Sync Endpoints

## Overview
I've created new endpoints in the Railway backend to support the Tally Database Loader integration. These endpoints need to be deployed to Railway and the database schema needs to be updated.

## 🆕 New Endpoints Created

### 1. Bulk Sync Endpoint
- **URL**: `POST /api/v1/bulk-sync/{companyId}/{divisionId}`
- **Purpose**: Accept batch data from Tally sync and store in database
- **Features**: 
  - Batch processing (100 records per batch)
  - Automatic retry logic
  - Upsert operations (insert/update)
  - Sync metadata tracking

### 2. Metadata Endpoint
- **URL**: `GET /api/v1/metadata/{companyId}/{divisionId}`
- **Purpose**: Provide sync metadata for incremental sync
- **Returns**: Last sync timestamps, AlterIDs, table status

### 3. Sync Status Endpoint
- **URL**: `GET /api/v1/sync-status/{companyId}/{divisionId}`
- **Purpose**: Monitor sync health and history
- **Returns**: Sync statistics, health status, recent sync history

## 📊 Database Schema Updates

### New Tables Required
1. **sync_metadata** - Track sync operations
2. **groups** - Tally account groups
3. **ledgers** - Chart of accounts
4. **stock_items** - Inventory items
5. **voucher_types** - Transaction types
6. **units** - Units of measure
7. **godowns** - Warehouses
8. **vouchers** - Transactions
9. **accounting_entries** - Accounting entries
10. **inventory_entries** - Inventory movements

## 🔧 Deployment Steps

### Step 1: Deploy Server Code to Railway
```bash
# Commit and push the updated server.js
git add server.js
git commit -m "Add bulk sync endpoints for Tally Database Loader integration"
git push origin main

# Railway will auto-deploy from the main branch
```

### Step 2: Update Database Schema
1. Access your Railway/Supabase database console
2. Run the SQL script: `database-schema-additions.sql`
3. Verify all tables are created successfully

### Step 3: Test Deployment
```bash
# Test the new endpoints
node test-new-endpoints.js

# Test full Tally sync
node tally-railway-sync.js
```

## 📋 Endpoint Details

### Bulk Sync Endpoint
```javascript
POST /api/v1/bulk-sync/{companyId}/{divisionId}
Content-Type: application/json

{
  "table": "groups",
  "data": [
    {
      "guid": "abc-123",
      "name": "Cash",
      "parent": "Current Assets",
      // ... more fields
    }
  ],
  "sync_type": "full",
  "batch_info": {
    "batch_number": 1,
    "total_batches": 1,
    "batch_size": 49
  },
  "metadata": {
    "source": "tally-database-loader",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Bulk sync completed for groups",
  "data": {
    "table": "groups",
    "total_records": 49,
    "processed": 49,
    "failed": 0,
    "batches": 1,
    "sync_type": "full",
    "company_id": "SKM",
    "division_id": "MAIN",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

### Metadata Endpoint
```javascript
GET /api/v1/metadata/{companyId}/{divisionId}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "company_id": "SKM",
    "division_id": "MAIN",
    "last_alter_id_master": 12345,
    "last_alter_id_transaction": 67890,
    "tables": {
      "groups": {
        "last_sync": "2025-01-01T00:00:00Z",
        "sync_type": "full",
        "records_processed": 49,
        "records_failed": 0
      }
    }
  }
}
```

### Sync Status Endpoint
```javascript
GET /api/v1/sync-status/{companyId}/{divisionId}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "company_id": "SKM",
    "division_id": "MAIN",
    "summary": {
      "total_tables": 5,
      "last_sync": "2025-01-01T00:00:00Z",
      "total_records_processed": 1500,
      "total_records_failed": 0,
      "sync_health": "healthy"
    },
    "recent_syncs": [...]
  }
}
```

## 🔄 Integration with Tally Sync

The Tally sync implementation (`tally-railway-sync.js`) is already configured to use these endpoints:

```javascript
// Configuration in railway-sync-config.json
{
  "railway": {
    "endpoints": {
      "bulk_sync": "/api/v1/bulk-sync",
      "metadata": "/api/v1/metadata",
      "sync_status": "/api/v1/sync-status"
    }
  }
}
```

## 🧪 Testing

### Test Endpoints Locally
```bash
# Start local server
node server.js

# Test endpoints
curl -X POST "http://localhost:3000/api/v1/bulk-sync/SKM/MAIN" \
  -H "Content-Type: application/json" \
  -d '{"table": "groups", "data": [{"guid": "test", "name": "Test"}]}'
```

### Test Full Integration
```bash
# Test Tally data extraction
node test-data-extraction.js

# Test complete sync (after deployment)
node tally-railway-sync.js
```

## 📊 Monitoring

### Check Sync Status
```bash
curl "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/sync-status/SKM/MAIN"
```

### View Metadata
```bash
curl "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/metadata/SKM/MAIN"
```

## 🚨 Error Handling

### Common Issues
1. **Database schema not created**: Run `database-schema-additions.sql`
2. **Supabase connection issues**: Check environment variables
3. **Batch size limits**: Endpoints handle automatic batching

### Debug Mode
Set `DEBUG=*` environment variable for detailed logging:
```bash
DEBUG=* node tally-railway-sync.js
```

## ✅ Success Criteria

After deployment, you should be able to:
1. ✅ Access all new endpoints (bulk-sync, metadata, sync-status)
2. ✅ Successfully sync data from Tally to Railway database
3. ✅ Monitor sync operations and health
4. ✅ Handle both full and incremental syncs
5. ✅ View sync history and statistics

## 🎯 Next Steps

1. **Deploy to Railway**: Push the updated server.js
2. **Update Database**: Run the schema additions
3. **Test Integration**: Run full Tally sync
4. **Monitor Performance**: Use the new endpoints to track sync health

---

The new endpoints provide a complete solution for Tally Database Loader integration with Railway backend! 🚀
