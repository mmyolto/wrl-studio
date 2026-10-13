@echo off
title Wantok Radio Light Studio - Link folder to GitHub
cd /d "%~dp0"
echo.
echo  Linking this folder to https://github.com/mmyolto/wrl-studio ...
echo.
set "GIT=git"
where git >nul 2>nul
if errorlevel 1 (
  for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do set "GIT=%%D\resources\app\git\cmd\git.exe"
)
if not exist ".git" "%GIT%" init -b main
"%GIT%" remote remove origin >nul 2>nul
"%GIT%" remote add origin https://github.com/mmyolto/wrl-studio.git
"%GIT%" fetch origin main
if errorlevel 1 goto failed
rem Point at what is already on GitHub, keeping every file in this folder as it is.
"%GIT%" reset --mixed origin/main
"%GIT%" branch --set-upstream-to=origin/main main >nul 2>nul
echo.
echo  Files that will be uploaded (new or changed):
"%GIT%" status --short
echo.
echo  Done. Now open GitHub Desktop, add this folder, commit and push.
pause
goto end
:failed
echo.
echo  Could not reach GitHub - take a screenshot of this window and send it to Claude.
pause
:end
