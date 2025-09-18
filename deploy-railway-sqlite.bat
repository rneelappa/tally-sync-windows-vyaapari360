@echo off
echo 🚀 Deploying Railway SQLite Service...
echo =====================================

echo.
echo 📋 Preparing files for deployment...

REM Copy the SQLite server as the main server
copy railway-sqlite-server.js server.js

REM Copy the SQLite Dockerfile as the main Dockerfile
copy Dockerfile.sqlite Dockerfile

echo ✅ Files prepared for deployment

echo.
echo 🔧 Railway deployment configuration:
echo    - Main file: railway-sqlite-server.js
echo    - Database: /data/tally.db (persistent)
echo    - Port: 3000
echo    - Health check: /api/v1/health

echo.
echo 📦 Ready for Railway deployment!
echo.
echo Next steps:
echo 1. Commit and push changes to git
echo 2. Railway will automatically redeploy
echo 3. The SQLite database will be persistent in /data folder
echo 4. Test the deployment with: curl https://your-railway-url/api/v1/health

echo.
echo 🎯 Key features of the new SQLite service:
echo    ✅ Includes 'notes' column in stock_items table
echo    ✅ Persistent database in /data folder
echo    ✅ Proper schema with all required tables
echo    ✅ Bulk sync API endpoints
echo    ✅ Health check endpoint
echo    ✅ Query and execute SQL endpoints

pause
