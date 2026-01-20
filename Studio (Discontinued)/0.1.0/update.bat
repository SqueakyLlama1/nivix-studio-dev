@echo off
REM ©2025 Nivix Technology
REM DO NOT DISTRIBUTE
REM Illegal distribution is punishable by law

echo (c) 2025 Nivix Technology
echo DO NOT DISTRIBUTE
echo Illegal distribution is punishable by law
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js was not found. Install it here:
    echo https://nodejs.org/en/download
    pause
    exit /b
)

REM Check for node_modules folder
if not exist node_modules (
    echo node_modules folder not found.
    echo Installing dependencies...
    npm install

    if %errorlevel% neq 0 (
        echo.
        echo npm install failed! Please check your package.json or internet connection.
        pause
        exit /b
    )
)

REM Run the Node.js script
echo.
echo Starting update.js...
node update.js