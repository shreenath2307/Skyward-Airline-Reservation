@echo off
cd /d "%~dp0"
if not exist .env ( copy .env.example .env >nul & echo Created .env - open it, set DB_PASSWORD, then run start.bat again. & notepad .env & exit /b )
if not exist node_modules ( echo Installing packages... & call npm install )
start "" http://localhost:3000
node server/index.js
pause
