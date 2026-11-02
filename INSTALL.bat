@echo off
title CAFE ZARRAR - First Time Setup
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║      CAFE ZARRAR POS - SETUP         ║
echo  ║      Pehli baar install ho raha hai  ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check Node.js
echo  [1/3] Node.js check kar raha hai...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ❌ Node.js install nahi hai!
    echo  Please pehle yahan se install karein:
    echo  https://nodejs.org
    echo.
    pause
    start https://nodejs.org
    exit
)
echo  ✅ Node.js mila!

:: npm install
echo.
echo  [2/3] Packages install ho rahe hain... (1-2 minute lagenge)
cd /d "%~dp0"
call npm install --silent
if %errorlevel% neq 0 (
    color 0C
    echo  ❌ Install fail hua! Internet connection check karein.
    pause
    exit
)
echo  ✅ Packages install ho gaye!

:: Create desktop shortcut
echo.
echo  [3/3] Desktop shortcut bana raha hai...
set SCRIPT_DIR=%~dp0
set SHORTCUT=%USERPROFILE%\Desktop\Cafe Zarrar POS.lnk
set LAUNCHER=%SCRIPT_DIR%START CAFE ZARRAR.bat

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%LAUNCHER%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = '%SCRIPT_DIR%icon.ico,0'; $s.Description = 'Cafe Zarrar POS System'; $s.Save()"

echo  ✅ Desktop shortcut ban gaya!

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   ✅ SETUP COMPLETE!                 ║
echo  ║   Ab "Cafe Zarrar POS" shortcut      ║
echo  ║   desktop par double click karein    ║
echo  ╚══════════════════════════════════════╝
echo.

:: Ask to launch now
set /p LAUNCH="  Abhi start karein? (Y/N): "
if /i "%LAUNCH%"=="Y" (
    call "%LAUNCHER%"
)
