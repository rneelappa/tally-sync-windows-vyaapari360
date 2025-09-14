# Railway Deployment - Alternative Non-Interactive Commands

## 🚀 Deployment Alternatives

### 1. **Git-based Deployment (Recommended)**
```bash
# Push to your repository
git add .
git commit -m "Update API"
git push origin main

# Railway will automatically deploy from Git
# No interactive commands needed!
```

### 2. **Railway Dashboard Deployment**
1. Go to https://railway.app/dashboard
2. Select your project: `appealing-wisdom`
3. Select service: `tally-sync-vyaapari360`
4. Click "Deploy" button
5. Railway will build and deploy automatically

### 3. **Railway CLI with Timeout**
```bash
# Deploy with timeout (non-interactive)
timeout 30s railway up || echo "Deploy completed or timed out"

# Check status without hanging
railway status --json
```

## 📊 Monitoring Alternatives

### 1. **Railway Dashboard (Best Option)**
- Go to https://railway.app/dashboard
- Select your project and service
- View logs, metrics, and deployment status
- No CLI hanging issues

### 2. **API Health Checks**
```bash
# Check if API is running
curl -s "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/health" | jq

# Test specific endpoints
curl -s "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/vouchers/SKM/MAIN" | jq
```

### 3. **Environment Variables Check**
```bash
# Check variables without hanging
railway variables --json | jq
```

### 4. **Service Status Check**
```bash
# Quick status check
railway status --json | jq
```

## 🔧 Configuration Management

### 1. **Set Environment Variables (Non-Interactive)**
```bash
# Set variables in one command
railway variables --set "TALLY_URL=https://e34014bc0666.ngrok-free.app" --set "NODE_ENV=production" --skip-deploys

# Verify variables
railway variables --json | jq '.data[] | select(.key == "TALLY_URL" or .key == "NODE_ENV")'
```

### 2. **Bulk Environment Setup**
```bash
# Create a script for environment setup
cat > setup-env.sh << 'EOF'
#!/bin/bash
echo "Setting up Railway environment variables..."

railway variables --set "TALLY_URL=https://e34014bc0666.ngrok-free.app" --skip-deploys
railway variables --set "NODE_ENV=production" --skip-deploys

echo "Environment variables set successfully!"
echo "Checking configuration..."
railway variables --json | jq '.data[] | select(.key == "TALLY_URL" or .key == "NODE_ENV")'
EOF

chmod +x setup-env.sh
./setup-env.sh
```

## 🧪 Testing & Verification

### 1. **Automated API Testing**
```bash
# Create a test script
cat > test-railway-api.sh << 'EOF'
#!/bin/bash
API_URL="https://tally-sync-vyaapari360-production.up.railway.app/api/v1"

echo "🧪 Testing Railway API..."

# Health check
echo "1. Health Check:"
curl -s "$API_URL/health" | jq '.success, .message'

# Test sync (if needed)
echo "2. Testing Sync:"
curl -s -X POST "$API_URL/sync/SKM/MAIN" \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "20250901", "toDate": "20250930"}' | jq '.success, .message'

# Test vouchers
echo "3. Testing Vouchers:"
curl -s "$API_URL/vouchers/SKM/MAIN?limit=3" | jq '.success, .data.total'

echo "✅ API testing completed!"
EOF

chmod +x test-railway-api.sh
./test-railway-api.sh
```

### 2. **Continuous Monitoring Script**
```bash
# Create a monitoring script
cat > monitor-api.sh << 'EOF'
#!/bin/bash
API_URL="https://tally-sync-vyaapari360-production.up.railway.app/api/v1"

while true; do
  echo "$(date): Checking API health..."
  
  if curl -s "$API_URL/health" | jq -e '.success' > /dev/null; then
    echo "✅ API is healthy"
  else
    echo "❌ API is down!"
  fi
  
  sleep 60
done
EOF

chmod +x monitor-api.sh
# Run in background: nohup ./monitor-api.sh &
```

## 🚨 Troubleshooting

### 1. **If Railway CLI Hangs**
```bash
# Kill hanging processes
pkill -f railway

# Use alternative methods
# 1. Use Railway Dashboard
# 2. Use Git-based deployment
# 3. Use API endpoints for monitoring
```

### 2. **Check Deployment Status**
```bash
# Quick status without hanging
timeout 10s railway status || echo "Status check completed"

# Alternative: Check via API
curl -s "https://tally-sync-vyaapari360-production.up.railway.app/api/v1/health" | jq '.timestamp'
```

### 3. **Force Redeploy**
```bash
# Trigger redeploy via Git
git commit --allow-empty -m "Force redeploy"
git push origin main

# Railway will automatically redeploy
```

## 📱 Railway Dashboard URLs

- **Project Dashboard**: https://railway.app/dashboard
- **Service Logs**: https://railway.app/dashboard → Select Project → Select Service → Logs
- **Environment Variables**: https://railway.app/dashboard → Select Project → Select Service → Variables
- **Deployments**: https://railway.app/dashboard → Select Project → Select Service → Deployments

## ✅ Recommended Workflow

1. **Development**: Use local testing with `npm test`
2. **Deployment**: Use Git push (automatic Railway deployment)
3. **Monitoring**: Use Railway Dashboard
4. **Testing**: Use API endpoints directly
5. **Configuration**: Use Railway Dashboard or CLI with `--skip-deploys`

This approach avoids all interactive CLI issues while maintaining full control over your deployment! 🚀
