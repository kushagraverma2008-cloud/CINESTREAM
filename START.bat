@echo off
title CineStream
color 0A
echo.
echo  ========================================
echo       CineStream - Starting Server
echo  ========================================
echo.

cd /d "%~dp0"

echo [1/2] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies OK.
)

echo.
echo [2/2] Starting CineStream server on port 3000...
echo.

start "" "http://localhost:3000"

node server.js
pause
