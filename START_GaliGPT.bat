@echo off
title GaliGPT Next Level
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js not found.
  echo Install Node.js, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Created .env from .env.example
  echo Make sure Ollama is installed and gemma3:4b has been downloaded.
  echo.
)

if not exist "node_modules" (
  echo Installing packages...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting GaliGPT...
echo Open http://localhost:3000 in Chrome or Edge.
echo.
call npm start
pause
