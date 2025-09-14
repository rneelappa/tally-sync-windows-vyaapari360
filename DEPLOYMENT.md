# 🚀 Railway Deployment Guide

## Quick Start

### 1. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 2. Set Environment Variables

```bash
# Set Tally URL (replace with your ngrok URL)
railway variables set TALLY_URL=https://e34014bc0666.ngrok-free.app

# Set environment
railway variables set NODE_ENV=production
```

### 3. Get Your API URL

```bash
# Get the deployment URL
railway domain
```

## 🧪 Testing Your Deployment

### Test Health Endpoint

```bash
curl https://your-railway-url.railway.app/api/v1/health
```

### Test Sync from Tally

```bash
curl -X POST https://your-railway-url.railway.app/api/v1/sync/SKM/MAIN \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "20250901", "toDate": "20250930"}'
```

### Test Get Vouchers

```bash
curl https://your-railway-url.railway.app/api/v1/vouchers/SKM/MAIN
```

## 🔗 Lovable.dev Integration

### 1. Update API Base URL

In your Lovable.dev project, update the API base URL:

```javascript
const TALLY_API_BASE = 'https://your-railway-url.railway.app/api/v1';
```

### 2. Use the Integration Code

Copy the `lovable-integration.js` file to your Lovable.dev project and use the components:

```javascript
import { TallyAPIService, useTallyVouchers, TallyVoucherManager } from './lovable-integration';

// Use in your components
function App() {
  return (
    <div>
      <TallyVoucherManager companyId="SKM" divisionId="MAIN" />
    </div>
  );
}
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | System health check |
| POST | `/api/v1/sync/{companyId}/{divisionId}` | Sync data from Tally |
| GET | `/api/v1/vouchers/{companyId}/{divisionId}` | List vouchers with filtering |
| GET | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}` | Get single voucher |
| PUT | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}` | Update voucher |
| GET | `/api/v1/voucher/{companyId}/{divisionId}/{voucherId}/xml` | Export as Tally XML |

## 🔧 Environment Variables

- `NODE_ENV`: Set to `production`
- `PORT`: Railway will set this automatically
- `TALLY_URL`: Your ngrok URL for Tally server

## 📈 Monitoring

### View Logs

```bash
railway logs
```

### Check Status

```bash
railway status
```

## 🚨 Troubleshooting

### Common Issues

1. **Tally URL not working**: Make sure your ngrok URL is active
2. **Sync fails**: Check Tally server is running and accessible
3. **API not responding**: Check Railway logs for errors

### Debug Commands

```bash
# Check deployment status
railway status

# View recent logs
railway logs --tail

# Check environment variables
railway variables
```

## ✅ Success Checklist

- [ ] API deployed to Railway
- [ ] Environment variables set
- [ ] Health endpoint responding
- [ ] Sync from Tally working
- [ ] Vouchers can be retrieved
- [ ] Updates working
- [ ] Lovable.dev integration ready

## 🎯 Next Steps

1. **Deploy to Railway** using the commands above
2. **Test all endpoints** to ensure they work
3. **Update Lovable.dev** with the new API URL
4. **Configure your Tally server** with the Railway API URL
5. **Start using** the XML-native Tally integration!

## 📞 Support

If you encounter any issues:

1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Test locally first: `npm test`
4. Check Tally server connectivity

Your XML-native Tally API is now ready for production! 🚀
