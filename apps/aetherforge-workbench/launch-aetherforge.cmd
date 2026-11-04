@echo off
setlocal
set "AETHERFORGE_SERVER=%~dp0server.mjs"
set "AETHERFORGE_PORT=4545"
set "AETHERFORGE_TITLE=Engineering Workbench"
if /I "%AETHERFORGE_LAUNCH_APP%"=="commercial" (
  set "AETHERFORGE_SERVER=%~dp0..\aetherforge-commercial\server.mjs"
  set "AETHERFORGE_PORT=4546"
  set "AETHERFORGE_TITLE=Commercial Workbench"
)
set "NODE_COMMAND=node"
if exist "%~dp0..\..\runtime\node.exe" set "NODE_COMMAND=%~dp0..\..\runtime\node.exe"
where "%NODE_COMMAND%" >nul 2>&1
if errorlevel 1 (
  echo [AetherForge] Node.js 22+ is required. Node was not found on PATH.
  echo Use an approved Node.js Windows ZIP: place node.exe at runtime\node.exe in the extracted package.
  echo An existing Node.js on PATH also works. No installer or administrator privileges are required.
  pause
  endlocal
  exit /b 1
)
set "NODE_MAJOR="
for /f "tokens=1 delims=." %%v in ('call "%NODE_COMMAND%" -p "process.versions.node" 2^>nul') do set "NODE_MAJOR=%%v"
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
echo Starting AetherForge %AETHERFORGE_TITLE%...
powershell -NoProfile -Command "try { $health = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $env:AETHERFORGE_PORT + '/api/health') -TimeoutSec 1; if ($health.adapter -eq 'ready' -and $health.source -eq 'maintained-library') { exit 0 } } catch {} exit 1" >nul 2>&1
if not errorlevel 1 goto server_ready
start "AetherForge Local Server" cmd /k ""%NODE_COMMAND%" "%AETHERFORGE_SERVER%""
set "ATTEMPTS=0"
:wait_for_health
powershell -NoProfile -Command "try { $health = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $env:AETHERFORGE_PORT + '/api/health') -TimeoutSec 1; if ($health.adapter -eq 'ready' -and $health.source -eq 'maintained-library') { exit 0 } } catch {} exit 1" >nul 2>&1
if not errorlevel 1 goto server_ready
set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 15 goto startup_failed
timeout /t 1 /nobreak >nul
goto wait_for_health
:server_ready
start "" "http://127.0.0.1:%AETHERFORGE_PORT%/"
echo Opened local workbench. Close the server console to stop the service.
endlocal
exit /b 0
:startup_failed
echo [AetherForge] The local adapter did not become healthy within 30 seconds.
echo Check the server console for details. Close it to stop the service, then correct the error and retry.
pause
endlocal
exit /b 1
