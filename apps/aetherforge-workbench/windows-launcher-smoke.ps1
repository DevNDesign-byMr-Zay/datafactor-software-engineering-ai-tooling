$ErrorActionPreference = 'Stop'

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $appDir 'launch-aetherforge.cmd'
$serverPath = (Resolve-Path (Join-Path $appDir 'server.mjs')).Path
$realNode = (Get-Command node.exe -ErrorAction Stop).Source
$nodeMajor = [int](& $realNode -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) { throw "Windows QA requires Node.js 22+, found $nodeMajor." }

function Stop-WorkbenchServer {
  $matches = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -in @('node.exe', 'cmd.exe') -and $_.CommandLine -and
      $_.CommandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
  }
  foreach ($process in $matches) {
    & taskkill.exe /PID $process.ProcessId /T /F 2>$null | Out-Null
  }
}

function Invoke-Launcher {
  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = $env:ComSpec
  $start.Arguments = '/d /c call "' + $launcher + '" <NUL'
  $start.WorkingDirectory = $appDir
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $process = [Diagnostics.Process]::Start($start)
  if (-not $process.WaitForExit(45000)) {
    Stop-WorkbenchServer
    throw 'Launcher did not return within 45 seconds.'
  }
  $watch.Stop()
  [pscustomobject]@{
    ExitCode = $process.ExitCode
    Elapsed = $watch.Elapsed
    Output = ''
  }
}

function New-NodeShim([string]$Mode, [string]$Root) {
  $shimDir = Join-Path $Root $Mode
  New-Item -ItemType Directory -Force -Path $shimDir | Out-Null
  $shim = @'
@echo off
if /I "%~1"=="-p" (
  if /I "%AETHERFORGE_TEST_NODE_MODE%"=="legacy" (echo 20.19.0) else (echo 22.13.1)
  exit /b 0
)
echo server-start>>"%AETHERFORGE_TEST_NODE_LOG%"
if /I "%AETHERFORGE_TEST_NODE_MODE%"=="legacy" exit /b 97
timeout /t 6 /nobreak >nul
"%AETHERFORGE_REAL_NODE%" %*
exit /b %errorlevel%
'@
  Set-Content -Path (Join-Path $shimDir 'node.cmd') -Value $shim -Encoding Ascii
  return $shimDir
}

$originalPath = $env:PATH
$originalMode = $env:AETHERFORGE_TEST_NODE_MODE
$originalLog = $env:AETHERFORGE_TEST_NODE_LOG
$originalRealNode = $env:AETHERFORGE_REAL_NODE
$testRoot = Join-Path $env:RUNNER_TEMP ('aetherforge-launcher-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
try {
  $env:AETHERFORGE_REAL_NODE = $realNode
  $env:AETHERFORGE_TEST_NODE_LOG = Join-Path $testRoot 'legacy-node-invocations.txt'
  $env:AETHERFORGE_TEST_NODE_MODE = 'legacy'
  $env:PATH = (New-NodeShim 'legacy' $testRoot) + ';' + $originalPath
  $legacy = Invoke-Launcher
  Stop-WorkbenchServer
  if ($legacy.ExitCode -eq 0) {
    throw 'Launcher accepted Node.js 20 instead of returning a startup error.'
  }
  if (Test-Path $env:AETHERFORGE_TEST_NODE_LOG) {
    throw 'Launcher started the server even though the Node.js runtime was below version 22.'
  }
  Write-Host 'PASS: launcher rejects Node.js 20 before starting the adapter.'

  $env:AETHERFORGE_TEST_NODE_MODE = 'slow'
  $env:AETHERFORGE_TEST_NODE_LOG = Join-Path $testRoot 'slow-node-invocations.txt'
  $env:PATH = (New-NodeShim 'slow' $testRoot) + ';' + $originalPath
  $slow = Invoke-Launcher
  if ($slow.ExitCode -ne 0) { throw 'Launcher failed with Node.js 22.' }
  if ($slow.Elapsed.TotalSeconds -lt 5.5) {
    throw "Launcher returned after $([math]::Round($slow.Elapsed.TotalSeconds, 2))s instead of waiting for the delayed health endpoint."
  }
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4545/api/health' -TimeoutSec 5
  if ($health.adapter -ne 'ready' -or $health.source -ne 'maintained-library') {
    throw 'Launcher returned before the maintained adapter reported healthy.'
  }
  $summary = Invoke-RestMethod -Uri 'http://127.0.0.1:4545/api/workbench/summary' -TimeoutSec 5
  if ($summary.source -ne 'maintained-library' -or $summary.moduleCount -lt 1) {
    throw 'Workbench summary did not expose the maintained module catalog.'
  }
  Write-Host "PASS: launcher waited $([math]::Round($slow.Elapsed.TotalSeconds, 2))s for the delayed adapter health response."

  $env:PATH = $originalPath
  $env:AETHERFORGE_TEST_NODE_MODE = $originalMode
  $env:AETHERFORGE_TEST_NODE_LOG = $originalLog
  $env:AETHERFORGE_REAL_NODE = $originalRealNode
  & $realNode (Join-Path $appDir 'browser-qa.mjs')
  if ($LASTEXITCODE -ne 0) { throw "Responsive browser QA exited with code $LASTEXITCODE." }
}
finally {
  $env:PATH = $originalPath
  $env:AETHERFORGE_TEST_NODE_MODE = $originalMode
  $env:AETHERFORGE_TEST_NODE_LOG = $originalLog
  $env:AETHERFORGE_REAL_NODE = $originalRealNode
  Stop-WorkbenchServer
  Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
exit 0
