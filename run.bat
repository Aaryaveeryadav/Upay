@echo off
REM Safe launcher: never expose the project root with Python's static server.
setlocal EnableDelayedExpansion
cd /d "%~dp0"
if not defined PORT set PORT=8004
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required: https://nodejs.org/
  echo Do not serve the project root with a generic static server: it contains private data.
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEVER=%%v
if !NODEVER! LSS 18 (
  echo Node.js 18 or newer is required.
  pause
  exit /b 1
)
echo Starting Upay at http://localhost:%PORT%
echo Press Ctrl+C to stop.
start "" "http://localhost:%PORT%"
node server.js
