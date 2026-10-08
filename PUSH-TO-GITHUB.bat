@echo off
title Wantok Radio Light Studio - Upload to GitHub
cd /d "%~dp0"
echo.
echo  ==========================================================
echo   Upload Wantok Radio Light Studio to GitHub
echo  ==========================================================
echo.
echo  Before you start: on github.com click  +  then  New repository.
echo  Name it (e.g. wrl-studio), choose Private, and do NOT tick
echo  "Add a README" or ".gitignore". Then copy the repository link,
echo  e.g. https://github.com/your-name/wrl-studio.git
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo  Git is not installed. Opening the download page...
  echo  Install it with the default options, then double-click this file again.
  start https://git-scm.com/download/win
  pause
  exit /b 1
)

echo  [1/4] Refreshing package-lock.json...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed

if not exist ".git" (
  echo.
  echo  [2/4] Creating the local repository...
  git init -b main
  if errorlevel 1 goto failed
) else (
  echo.
  echo  [2/4] Local repository already exists.
)

rem Git needs a name and email for the history. Ask once if not set.
git config user.name >nul 2>nul
if errorlevel 1 (
  set /p GITNAME=  Your name for the commit history: 
  call git config user.name "%%GITNAME%%"
)
git config user.email >nul 2>nul
if errorlevel 1 (
  set /p GITEMAIL=  Your GitHub email: 
  call git config user.email "%%GITEMAIL%%"
)

echo.
echo  [3/4] Saving all files (your Firebase keys and node_modules are left out)...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git rev-parse --verify HEAD >nul 2>nul
  if errorlevel 1 (
    git commit -m "Wantok Radio Light Studio - first upload"
  ) else (
    git commit -m "Update Wantok Radio Light Studio"
  )
  if errorlevel 1 goto failed
) else (
  echo  Nothing new to save.
)

echo.
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  set /p REPO=  Paste the GitHub repository link and press Enter: 
  call git remote add origin "%%REPO%%"
  if errorlevel 1 goto failed
)

echo.
echo  [4/4] Uploading to GitHub. If a sign-in window opens, sign in to GitHub.
rem Pick up anything added on github.com first (e.g. a file created in the browser).
git pull --rebase origin main >nul 2>nul
git push -u origin main
if errorlevel 1 goto failed

echo.
echo  ==========================================================
echo   Done! Refresh your repository page on github.com.
echo   Next time, double-click this file again to upload changes.
echo  ==========================================================
pause
goto end

:failed
echo.
echo  Something went wrong - take a screenshot of this window and send it to Claude.
pause
:end
