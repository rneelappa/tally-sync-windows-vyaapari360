@echo off
echo Starting Tally Sync Vyaapari360 Local Server...
echo.

REM Load environment variables from config.env
if exist config.env (
    echo Loading configuration from config.env...
    for /f "usebackq tokens=1,2 delims==" %%a in ("config.env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" (
            set "%%a=%%b"
        )
    )
) else (
    echo Warning: config.env not found. Using default values.
)

REM Set default values if not set
if not defined NODE_ENV set NODE_ENV=development
if not defined PORT set PORT=3000
if not defined TALLY_URL set TALLY_URL=http://localhost:9000

echo Configuration:
echo   NODE_ENV=%NODE_ENV%
echo   PORT=%PORT%
echo   TALLY_URL=%TALLY_URL%
echo.

REM Test Tally connection first
echo Testing Tally connection...
node test-tally-connection.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo Error: Tally connection test failed.
    echo Please ensure Tally is running and XML Server is enabled.
    echo.
    pause
    exit /b 1
)

echo.
echo Starting server...
node server.js

pause
