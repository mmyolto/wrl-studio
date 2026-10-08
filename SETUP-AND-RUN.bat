@echo off
title Wantok Radio Light Studio - Setup
cd /d "%~dp0"
echo.
echo  ==========================================================
echo   Wantok Radio Light Studio - one-time setup
echo  ==========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed. Opening the download page...
  echo  Install the LTS version, then double-click this file again.
  start https://nodejs.org
  pause
  exit /b 1
)

echo  [1/4] Installing app packages (takes a few minutes the first time)...
call npm install
if errorlevel 1 goto failed

echo.
echo  [2/4] Installing Firebase tools...
call npm install -g firebase-tools
if errorlevel 1 goto failed

echo.
echo  [3/4] Signing in to Firebase.
echo        A browser window will open - sign in with the Google account
echo        that owns the "wrl-studio" Firebase project and click Allow.
echo        If asked about collecting usage info, type n and press Enter.
call firebase login
if errorlevel 1 goto failed

echo.
echo  [4/4] Publishing the database security rules...
call firebase deploy --only firestore:rules --project wrl-studio
if errorlevel 1 goto failed

echo.
echo  ==========================================================
echo   Setup complete! Starting the app at http://localhost:5173
echo   Keep this window open while you use the app.
echo  ==========================================================
call npm run dev -- --open
goto end

:failed
echo.
echo  Something went wrong - take a screenshot of this window and send it to Claude.
pause
:end
