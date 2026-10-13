@echo off
title Wantok Radio Light Studio - Publish online
cd /d "%~dp0"
echo.
echo  ==========================================================
echo   Publishing Wantok Radio Light Studio online (Firebase Hosting)
echo   Your team will use:  https://wrl-studio.web.app
echo  ==========================================================
echo.

where firebase >nul 2>nul
if errorlevel 1 (
  echo  Installing Firebase tools...
  call npm install -g firebase-tools
  if errorlevel 1 goto failed
)

echo  [1/3] Installing packages...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed

echo.
echo  [2/3] Building the app...
call npm run build
if errorlevel 1 goto failed

echo.
echo  [3/3] Uploading the app and database rules to Firebase...
call firebase deploy --only hosting,firestore:rules --project wrl-studio
if errorlevel 1 (
  echo.
  echo  You may need to sign in to Firebase first. A browser window will open.
  call firebase login
  call firebase deploy --only hosting,firestore:rules --project wrl-studio
  if errorlevel 1 goto failed
)

echo.
echo  ==========================================================
echo   Done! Send this link to your team:
echo.
echo        https://wrl-studio.web.app
echo.
echo   Run this file again whenever the app is updated.
echo  ==========================================================
start https://wrl-studio.web.app
pause
goto end

:failed
echo.
echo  Something went wrong - take a screenshot of this window and send it to Claude.
pause
:end
