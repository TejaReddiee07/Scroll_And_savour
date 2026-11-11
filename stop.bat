@echo off
title Fuji Japanese Restaurant - stop
echo Stopping the Fuji website and API...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\stop.ps1"
echo Done.
ping -n 3 127.0.0.1 >nul
