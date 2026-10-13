@echo off
title Wantok Radio Light Studio - Update database rules
cd /d "%~dp0"
echo.
echo  ==========================================================
echo   Publishing the latest database rules to Firebase (wrl-studio)
echo  ==========================================================
echo.

where firebase >nul 2>nul
if errorlevel 1 (
  echo  Firebase tools are not installed yet. Installing...
  call npm install -g firebase-tools
  if errorlevel 1 goto failed
)

call firebase deploy --only firestore:rules --project wrl-studio
if errorlevel 1 (
  echo.
  echo  You may need to sign in to Firebase first. A browser window will open.
  call firebase login
  call firebase deploy --only firestore:rules --project wrl-studio
  if errorlevel 1 goto failed
)

echo.
echo  ==========================================================
echo   Done! The rules are live. Reload the app in your browser.
echo  ==========================================================
pause
goto end

:failed
echo.
echo  The rules could not be published - take a screenshot of this window and send it to Claude.
pause
:end
