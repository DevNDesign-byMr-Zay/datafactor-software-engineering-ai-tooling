@echo off
setlocal
set "AETHERFORGE_LAUNCH_APP=commercial"
call "%~dp0..\aetherforge-workbench\launch-aetherforge.cmd"
set "AETHERFORGE_EXIT=%errorlevel%"
endlocal & exit /b %AETHERFORGE_EXIT%
