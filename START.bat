@echo off
title User Management Dashboard
cd /d "%~dp0"
echo.
echo  User Management Dashboard
echo  ========================
echo  Starting local server...
echo.
echo  Open your browser at:  http://localhost:8080
echo.
echo  Press Ctrl+C to stop the server.
echo.

python -m http.server 8080 2>nul
if errorlevel 1 (
  py -m http.server 8080 2>nul
)
if errorlevel 1 (
  echo Python not found. Install Python from https://python.org
  echo Or double-click index.html to open directly in your browser.
  pause
)
