@echo off
title NextOnTV - Server, Cloud Sync & Tunnel 4G/5G
cd /d "%~dp0"
echo Chiusura eventuali istanze precedenti sulla porta 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
echo Avvio di NextOnTV in corso...
start "" "http://localhost:8080"
python server.py
pause
