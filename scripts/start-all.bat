@echo off
rem Starts (or re-starts) everything. Safe to run any time - it never deletes data.
echo Starting OpenGym...
cd /d "%~dp0..\opengym"      && docker compose up -d
echo Starting NutriTrace...
cd /d "%~dp0..\nutritrace"   && docker compose up -d
echo Starting the address proxy...
cd /d "%~dp0.."              && docker compose up -d
echo.
echo Done. Run smoke-test.bat to check that everything is healthy.
pause
