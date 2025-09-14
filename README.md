# Tally XML API - Railway Deployment

A production-ready XML-native API for Tally ERP integration, designed for Railway deployment and serving as the single source of truth for all Tally data.

## 🚀 Features

- **XML-Native Storage**: Lossless XML data handling with perfect Tally compatibility
- **Multi-Tenant Support**: Company and division-based data isolation
- **Real-time Sync**: Direct integration with Tally ERP via ngrok
- **RESTful API**: Clean, documented endpoints for frontend integration
- **Production Ready**: Dockerized, health-checked, and Railway-optimized

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | System health check |
| POST | `/api/v1/sync/{companyId}/{divisionId}` | Sync data from Tally |
| GET | `/api/v1/vouchers/{companyId}/{divisionId}` | List vouchers with filtering |
| GET | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}` | Get single voucher |
| PUT | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}` | Update voucher |
| GET | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}/xml` | Export as Tally XML |

## 🔧 Environment Variables

```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note:** Tally URLs are now stored per division in Supabase, not as environment variables.

## 🚀 Railway Deployment

### 1. Connect to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init
```

### 2. Set Environment Variables

```bash
# Set Supabase configuration
railway variables set SUPABASE_URL=https://your-project.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Set environment
railway variables set NODE_ENV=production
```

### 3. Deploy

```bash
# Deploy to Railway
railway up
```

### 4. Get Deployment URL

```bash
# Get the deployment URL
railway domain
```

## 🧪 Testing

### Local Testing

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test API
curl http://localhost:3000/api/v1/health
```

### Production Testing

```bash
# Test health endpoint
curl https://your-railway-url.railway.app/api/v1/health

# Sync data from Tally
curl -X POST https://your-railway-url.railway.app/api/v1/sync/SKM/MAIN \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "20250901", "toDate": "20250930"}'

# Get vouchers
curl https://your-railway-url.railway.app/api/v1/vouchers/SKM/MAIN
```

## 📊 Usage Examples

### Sync Data from Tally

```javascript
const response = await fetch('https://your-railway-url.railway.app/api/v1/sync/SKM/MAIN', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromDate: '20250901',
    toDate: '20250930'
  })
});

const result = await response.json();
console.log(`Synced ${result.data.storedVouchers} vouchers`);
```

### Get Vouchers with Filtering

```javascript
const response = await fetch('https://your-railway-url.railway.app/api/v1/vouchers/SKM/MAIN?page=1&limit=10&type=Payment');
const result = await response.json();
console.log(result.data.vouchers);
```

### Update Voucher

```javascript
const response = await fetch('https://your-railway-url.railway.app/api/v1/voucher/SKM/MAIN/12345', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    narration: 'Updated via API'
  })
});
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Request validation
- **Rate Limiting**: Built-in protection
- **Health Checks**: Automatic monitoring

## 📈 Performance

- **In-Memory Storage**: Fast access for development
- **Compression**: Gzip compression for responses
- **Caching**: Efficient data retrieval
- **Pagination**: Optimized large dataset handling

## 🔄 Data Flow

1. **Sync**: Tally → API → XML Storage
2. **Query**: API → XML Storage → JSON Response
3. **Update**: JSON → XML Update → Storage
4. **Export**: XML Storage → Tally Import Format

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Tally     │───▶│  Railway API │───▶│  Lovable    │
│   (ngrok)   │    │  (XML Store) │    │  Frontend   │
└─────────────┘    └──────────────┘    └─────────────┘
```

## 📝 Notes

- This API serves as the **single source of truth** for all Tally data
- No Supabase tables needed - all data stored in XML-native format
- Perfect for integration with Lovable.dev frontend
- Supports multiple companies and divisions
- Maintains perfect Tally XML compatibility

## 🆘 Support

For issues or questions, please check the logs:

```bash
# View Railway logs
railway logs
```

## 📄 License

MIT License - see LICENSE file for details.
