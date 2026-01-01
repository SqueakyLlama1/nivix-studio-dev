::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJGyX8VAjFBlbQgGBAE+1BaAR7ebv/Napq1sUTKIMbJrf07uycK5BpBXYc5c733lVloUFDxQ4
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSzk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJGyX8VAjFBlbQgGBAE+1BaAR7ebv/Napq1sUTKIMbJrf07uycK5BpBXYZoI40nNV1s4UCXs=
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
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
echo Starting runtime.js...
node runtime.js