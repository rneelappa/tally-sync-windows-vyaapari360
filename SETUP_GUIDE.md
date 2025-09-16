# 🚀 Tally Sync Vyaapari360 - Setup Guide

## Overview
This project connects to Tally running at `localhost:9000` and syncs data to a Railway backend (Supabase database). It's designed to work with the existing Railway deployment at `https://tally-sync-vyaapari360-production.up.railway.app`.

## Prerequisites

### 1. Tally Setup
- **Tally Prime** must be installed and running
- **XML Server** must be enabled:
  - Go to `Help (F1) > Settings > Connectivity`
  - Set `Client/Server configuration` to `Both`
  - Ensure Tally is running on port `9000` (default)

### 2. Node.js
- **Node.js** (version 14 or higher) must be installed
- Verify installation: `node --version`

### 3. Railway Backend
- The Railway backend should be deployed and running
- URL: `https://tally-sync-vyaapari360-production.up.railway.app`

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `config.env` file with your settings:
```env
# Tally XML API Configuration
NODE_ENV=production
PORT=3000

# Supabase Configuration (Railway Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Tally Configuration
TALLY_URL=http://localhost:9000
```

### 3. Test Connections
```bash
# Test Tally and Railway connections
node test-tally-connection.js
```

### 4. Start the Server
```bash
# Option 1: Use the batch file (Windows)
start-local.bat

# Option 2: Run directly
node server.js
```

## Available Scripts

### Test Scripts
- `test-tally-connection.js` - Tests connection to Tally at localhost:9000
- `comprehensive-sync.js` - Syncs all data from Tally to Railway backend
- `test-xml-only.js` - Tests XML communication with Tally

### Main Scripts
- `server.js` - Main Express server (Railway deployment)
- `working-server.js` - Local development server
- `start-local.bat` - Windows batch file to start local server

## API Endpoints

The server provides these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/sync/{companyId}/{divisionId}` | Sync data from Tally |
| GET | `/api/v1/vouchers/{companyId}/{divisionId}` | List vouchers |
| GET | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}` | Get single voucher |
| PUT | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}` | Update voucher |

## Configuration

### Tally Configuration
- **URL**: `http://localhost:9000` (default Tally XML Server port)
- **Company**: Set in API requests (e.g., `SKM`)
- **Division**: Set in API requests (e.g., `MAIN`)

### Railway Backend
- **Base URL**: `https://tally-sync-vyaapari360-production.up.railway.app`
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Service role key required

## Usage Examples

### 1. Test Tally Connection
```bash
node test-tally-connection.js
```

### 2. Sync Data from Tally
```bash
# Using comprehensive sync
node comprehensive-sync.js

# Or via API
curl -X POST "http://localhost:3000/api/v1/sync/SKM/MAIN" \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "20250901", "toDate": "20250930"}'
```

### 3. Get Vouchers
```bash
curl "http://localhost:3000/api/v1/vouchers/SKM/MAIN"
```

## Troubleshooting

### Common Issues

#### 1. Tally Connection Failed
- **Error**: `ECONNREFUSED`
- **Solution**: Ensure Tally is running and XML Server is enabled
- **Check**: Go to `Help (F1) > Settings > Connectivity`

#### 2. Railway Backend Unavailable
- **Error**: `ETIMEDOUT` or connection refused
- **Solution**: Check Railway deployment status
- **Check**: Visit `https://tally-sync-vyaapari360-production.up.railway.app/api/v1/health`

#### 3. Supabase Authentication Failed
- **Error**: `Invalid API key`
- **Solution**: Update `SUPABASE_SERVICE_ROLE_KEY` in `config.env`

### Debug Commands

```bash
# Test Tally only
node test-tally-connection.js

# Test with verbose output
DEBUG=* node server.js

# Check Railway status
curl https://tally-sync-vyaapari360-production.up.railway.app/api/v1/health
```

## Project Structure

```
tally-sync-vyaapari360/
├── server.js                 # Main server (Railway)
├── working-server.js         # Local development server
├── comprehensive-sync.js     # Data sync script
├── test-tally-connection.js  # Connection test
├── config.env               # Environment configuration
├── start-local.bat          # Windows startup script
├── package.json             # Dependencies
├── railway.json             # Railway deployment config
└── TDLs/                    # Tally Definition Language files
    ├── VyaapariDateFilteredReport.tdl
    └── ... (other TDL files)
```

## Next Steps

1. **Configure Supabase**: Update credentials in `config.env`
2. **Test Tally**: Ensure Tally XML Server is running
3. **Run Sync**: Execute `node comprehensive-sync.js`
4. **Start Server**: Use `start-local.bat` or `node server.js`
5. **Monitor**: Check logs and API responses

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Railway logs: `railway logs`
3. Test individual components using the test scripts
4. Verify Tally XML Server configuration

---

**Ready to sync your Tally data! 🎉**
