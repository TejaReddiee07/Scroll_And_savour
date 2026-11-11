# Stops the Fuji API, website and in-memory demo database started by run.bat.
# Only touches processes that belong to THIS project folder — never an installed MongoDB service.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$stopped = 0

# 1. the console windows opened by run.bat (their child processes go with them)
foreach ($title in 'Fuji API*', 'Fuji Website*') {
  & taskkill.exe /FI "WINDOWTITLE eq $title" /T /F 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "  closed window: $($title.TrimEnd('*'))"; $stopped++ }
}

# 2. any remaining node processes of this project (API, demo backend, Vite dev/preview server)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine -like "*$root*" -and $_.CommandLine -match 'src[\\/]index\.js|scripts[\\/]demo\.js|vite' } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "  stopped node process $($_.ProcessId)"
    $stopped++
  }

# 3. in-memory demo databases (downloaded by mongodb-memory-server), not the MongoDB service
Get-CimInstance Win32_Process -Filter "Name='mongod.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -and $_.ExecutablePath -like '*mongodb-binaries*' } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "  stopped demo database $($_.ProcessId)"
    $stopped++
  }

if ($stopped -eq 0) { Write-Host '  nothing was running.' }
