@echo off
echo ========================================
echo  Local Tally Sync Development Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "local-server.js" (
    echo Error: local-server.js not found
    pause
    exit /b 1
)

if not exist "local-tally-sync.js" (
    echo Error: local-tally-sync.js not found
    pause
    exit /b 1
)

if not exist "local-config.json" (
    echo Error: local-config.json not found
    pause
    exit /b 1
)

echo Configuration files found ✓
echo.

echo What would you like to do?
echo 1. Start local server only
echo 2. Test Tally connection only
echo 3. Run full local sync
echo 4. Start server and run sync (recommended)
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Starting local server...
    echo Press Ctrl+C to stop the server
    node local-server.js
) else if "%choice%"=="2" (
    echo.
    echo Testing Tally connection...
    node test-tally-connection.js
) else if "%choice%"=="3" (
    echo.
    echo Running full local sync...
    echo Make sure local server is running in another terminal!
    timeout 3
    node local-tally-sync.js
) else if "%choice%"=="4" (
    echo.
    echo Starting local server in background...
    start "Local Server" node local-server.js
    echo Waiting for server to start...
    timeout 5
    echo.
    echo Running local sync...
    node local-tally-sync.js
    echo.
    echo Stopping local server...
    taskkill /f /im node.exe /fi "WINDOWTITLE eq Local Server*" >nul 2>&1
) else (
    echo Invalid choice. Please run the script again.
)

echo.
echo ========================================
echo Development session completed
echo ========================================
echo.
echo 📊 To view your data:
echo    • SQLite database: local-database.db
echo    • Use DB Browser for SQLite or similar tool
echo.
echo 🔧 To deploy to Railway:
echo    • Test everything works locally first
echo    • Update Railway configuration
echo    • Deploy server.js to Railway
echo    • Run database schema on Railway/Supabase
echo.
pause
