@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "PREFERRED_PORT=3011"
set "PORT=%PREFERRED_PORT%"
set "APP_URL=http://localhost:%PORT%"

echo ==========================================
echo AppFramework quick start
echo ==========================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found in PATH.
  exit /b 1
)

echo [1/7] Closing old localhost node servers on ports 3000 and 3011...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports=@(3000,3011);" ^
  "$list=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort };" ^
  "foreach($item in $list){" ^
  "  $p=Get-Process -Id $item.OwningProcess -ErrorAction SilentlyContinue;" ^
  "  if($p -and ($p.ProcessName -match '^(node|next)$')){" ^
  "    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue;" ^
  "    Write-Host ('Stopped PID {0} ({1}) on port {2}' -f $p.Id,$p.ProcessName,$item.LocalPort);" ^
  "  }" ^
  "}"

echo [2/7] Resolving port (prefer 3011)...
for /f %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$preferred=3011;" ^
  "$inUse=Get-NetTCPConnection -LocalPort $preferred -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "if(-not $inUse){Write-Output $preferred; exit 0};" ^
  "$proc=Get-Process -Id $inUse.OwningProcess -ErrorAction SilentlyContinue;" ^
  "if($proc -and ($proc.ProcessName -match '^(node|next)$')){Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 300; Write-Output $preferred; exit 0};" ^
  "$fallback=3012..3999 | Where-Object { -not (Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue) } | Select-Object -First 1;" ^
  "if($fallback){Write-Output $fallback} else {Write-Output $preferred}"') do set "PORT=%%P"

if not defined PORT set "PORT=%PREFERRED_PORT%"
set "APP_URL=http://localhost:%PORT%"
echo     Using port !PORT!

echo [3/7] Cleaning local cache...
if exist ".next" rd /s /q ".next"
if exist "node_modules\.prisma\client" rd /s /q "node_modules\.prisma\client"

echo [4/7] Checking dependencies...
if not exist "node_modules" (
  echo     node_modules not found. Running npm install...
  call npm.cmd install
  if errorlevel 1 goto :fail
) else (
  call npm.cmd ls --depth=0 >nul 2>&1
  if errorlevel 1 (
    echo     Dependency tree mismatch. Running npm install...
    call npm.cmd install
    if errorlevel 1 goto :fail
  ) else (
    echo     Dependencies already OK.
  )
)

echo [5/7] Generating Prisma client...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem 'node_modules\.prisma\client' -Filter '*.tmp*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue;"

call npm.cmd run prisma:generate
if errorlevel 1 (
  echo     [RETRY] Cleaning Prisma cache and retrying...
  if exist "node_modules\.prisma\client" rd /s /q "node_modules\.prisma\client"
  timeout /t 1 /nobreak >nul
  call npm.cmd run prisma:generate
  if errorlevel 1 goto :fail
)

echo [6/7] Syncing database schema (best effort)...
call npm.cmd run prisma:push
if errorlevel 1 (
  echo     [WARN] prisma:push failed. App will still start.
)

echo [7/7] Updating .env.local app URL...
if exist ".env.local" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$path='.env.local';" ^
    "$port='%PORT%';" ^
    "$newLine='NEXT_PUBLIC_APP_URL=http://localhost:' + $port;" ^
    "$content=Get-Content $path -ErrorAction SilentlyContinue;" ^
    "if(-not $content){$content=@()};" ^
    "if($content -match '^NEXT_PUBLIC_APP_URL='){" ^
    "  $content=$content -replace '^NEXT_PUBLIC_APP_URL=.*$', $newLine;" ^
    "} else {" ^
    "  $content += $newLine;" ^
    "}" ^
    "Set-Content -Path $path -Value $content -Encoding UTF8;"
)

echo.
echo Starting app on !APP_URL!
echo Press Ctrl+C to stop.
echo.

if exist "node_modules\.bin\next.cmd" (
  call node_modules\.bin\next.cmd dev -p !PORT!
) else (
  call npm.cmd run dev -- --port !PORT!
)

exit /b %errorlevel%

:fail
echo [ERROR] Startup failed.
exit /b 1
