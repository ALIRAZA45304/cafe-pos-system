@echo off
title CAFE ZARRAR POS
cd /d "%~dp0"

:: Check if node_modules exist
if not exist "node_modules" (
    echo  Pehli baar setup chal raha hai...
    call npm install --silent
)

:: Start the app silently
start "" /B npm start

:: Wait for app to load then close this window
timeout /t 3 /nobreak >nul
exit
