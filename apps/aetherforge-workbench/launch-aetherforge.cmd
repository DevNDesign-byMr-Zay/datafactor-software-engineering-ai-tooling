@echo off
setlocal
where node >nul 2>&1
if errorlevel 1 (
  echo [AetherForge] Node.js 22+ is required. Node was not found on PATH.
  echo Install Node.js as a non-admin user if permitted, then retry.
  pause
  endlocal
  exit /b 1
)
set "NODE_MAJOR="
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR (
  echo [AetherForge] Could not read the installed Node.js version.
  echo Install Node.js 22 or newer, then retry.
  pause
  endlocal
  exit /b 1
)
if %NODE_MAJOR% LSS 22 (
  echo [AetherForge] Node.js 22+ is required. Detected Node.js %NODE_MAJOR%.
  echo Install Node.js 22 or newer, then retry.
  pause
  endlocal
  exit /b 1
)
echo Starting ÆtherForge Engineering Workbench...
start "AetherForge Local Server" cmd /k node "%~dp0server.mjs"
set "ATTEMPTS=0"
:wait_for_health
powershell -NoProfile -Command "try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4545/api/health' -TimeoutSec 1; if ($health.adapter -eq 'ready' -and $health.source -eq 'maintained-library') { exit 0 } } catch {} exit 1" >nul 2>&1
if not errorlevel 1 goto server_ready
set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 15 goto startup_failed
timeout /t 1 /nobreak >nul
goto wait_for_health
:server_ready
start "" "http://127.0.0.1:4545/"
echo Opened local workbench. Close the server console to stop the service.
endlocal
exit /b 0
:startup_failed
echo [AetherForge] The local adapter did not become healthy within 30 seconds.
echo Check the server console for details. Close it to stop the service, then correct the error and retry.
pause
endlocal
exit /b 1
