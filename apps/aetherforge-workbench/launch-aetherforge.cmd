@echo off
setlocal
where node >nul 2>&1
if errorlevel 1 (
  echo [AetherForge] Node.js 22+ is required. Node was not found on PATH.
  echo Install Node.js as a non-admin user if permitted, then retry.
  pause
  exit /b 1
)
echo Starting ÆtherForge Engineering Workbench...
start "AetherForge Local Server" cmd /k node "%~dp0server.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4545/"
echo Opened local workbench. Close the server console to stop the service.
endlocal
