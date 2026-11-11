@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Fuji Japanese Restaurant - launcher
cd /d "%~dp0"
set "ROOT=%~dp0"

echo.
echo  ==========================================================
echo     FUJI Japanese Restaurant  -  starting everything
echo  ==========================================================
echo.

rem ---------------------------------------------------------------
rem  0. Node.js
rem ---------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo  [x] Node.js is not installed.
  echo      Install the LTS version from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo  [1/5] Node.js !NODEV! found.

rem ---------------------------------------------------------------
rem  1. Dependencies (only the first time)
rem ---------------------------------------------------------------
echo  [2/5] Checking packages...
if not exist "%ROOT%server\node_modules" (
  echo        Installing server packages - first run only, this can take a few minutes...
  pushd "%ROOT%server" & call npm install --no-audit --no-fund & popd
)
if not exist "%ROOT%client\node_modules" (
  echo        Installing website packages - first run only...
  pushd "%ROOT%client" & call npm install --no-audit --no-fund & popd
)
if not exist "%ROOT%server\node_modules" ( echo  [x] Server packages failed to install. & pause & exit /b 1 )
if not exist "%ROOT%client\node_modules" ( echo  [x] Website packages failed to install. & pause & exit /b 1 )

rem ---------------------------------------------------------------
rem  2. Settings file
rem ---------------------------------------------------------------
if not exist "%ROOT%server\.env" (
  copy "%ROOT%server\.env.example" "%ROOT%server\.env" >nul
  echo        Created server\.env from the example - add your keys there.
)

rem ---------------------------------------------------------------
rem  3. Database + API (port 5000)
rem     MONGODB_URI in server\.env (MongoDB Atlas or a local MongoDB) reachable -> real database, data is kept
rem     otherwise -> demo database in memory (resets on every restart)
rem ---------------------------------------------------------------
set "MODE=demo"
pushd "%ROOT%server"
node scripts\check-db.js
if not errorlevel 1 set "MODE=real"
popd

curl -s http://localhost:5000/api/health 2>nul | findstr /c:"\"ok\":true" >nul
if not errorlevel 1 (
  echo  [3/5] The API is already running on port 5000 - using it.
) else (
  if "!MODE!"=="real" (
    echo  [3/5] Starting the API with your MongoDB database - orders and edits are saved.
    pushd "%ROOT%server" & call npm run seed & popd
    start "Fuji API (port 5000)" /min cmd /k "cd /d "%ROOT%server" && node "%ROOT%server\src\index.js""
  ) else (
    echo  [3/5] No MongoDB reachable - starting the DEMO database in memory.
    echo        Demo data resets every time. Set MONGODB_URI in server\.env to keep data.
    start "Fuji API - demo database (port 5000)" /min cmd /k "cd /d "%ROOT%server" && node "%ROOT%server\scripts\demo.js""
  )
)

set /a TRIES=0
:wait_api
set /a TRIES+=1
curl -s http://localhost:5000/api/health 2>nul | findstr /c:"\"db\":\"connected\"" >nul
if not errorlevel 1 goto api_ready
if !TRIES! geq 90 (
  echo  [!] The API did not come up after 3 minutes. Check the "Fuji API" window for errors.
  goto start_web
)
<nul set /p "=."
ping -n 3 127.0.0.1 >nul
goto wait_api
:api_ready
echo.
echo        API is up and connected to the database.

rem ---------------------------------------------------------------
rem  4. Website (port 5173)
rem ---------------------------------------------------------------
:start_web
set "CODE="
for /f %%c in ('curl -s -o nul -w "%%{http_code}" http://localhost:5173/ 2^>nul') do set "CODE=%%c"
if "!CODE!"=="200" (
  echo  [4/5] The website is already running on port 5173.
) else (
  echo  [4/5] Starting the website...
  start "Fuji Website (port 5173)" /min cmd /k "cd /d "%ROOT%client" && npm run dev -- --host"
)

set /a TRIES=0
:wait_web
set /a TRIES+=1
for /f %%c in ('curl -s -o nul -w "%%{http_code}" http://localhost:5173/ 2^>nul') do set "CODE=%%c"
if "!CODE!"=="200" goto web_ready
if !TRIES! geq 60 (
  echo  [!] The website did not start. Check the "Fuji Website" window for errors.
  if not defined FUJI_NO_PAUSE pause
  exit /b 1
)
<nul set /p "=."
ping -n 3 127.0.0.1 >nul
goto wait_web
:web_ready
echo.

rem Local network address (open the site from a phone on the same Wi-Fi)
set "LANIP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  if not defined LANIP set "LANIP=%%a"
)
if defined LANIP set "LANIP=!LANIP: =!"

echo  [5/5] Everything is running.
echo.
echo  ==========================================================
echo    Website        http://localhost:5173
echo    Admin          http://localhost:5173/admin
if "!MODE!"=="demo" echo                   demo login: owner@fuji.demo  /  FujiDemo2026!
if "!MODE!"=="real" (
  set "ADMINMAIL="
  for /f "usebackq tokens=1,* delims==" %%a in ("%ROOT%server\.env") do if /i "%%a"=="ADMIN_EMAIL" set "ADMINMAIL=%%b"
  echo                   login: !ADMINMAIL!  /  password = ADMIN_PASSWORD in server\.env
)
echo    API health     http://localhost:5000/api/health
if defined LANIP echo    On your phone  http://!LANIP!:5173   (same Wi-Fi)
echo  ==========================================================
echo.
echo    The API and website run in their own (minimised) windows.
echo    To stop everything, run stop.bat or close those windows.
echo.
if not defined FUJI_NO_BROWSER start "" "http://localhost:5173"
if not defined FUJI_NO_PAUSE pause
