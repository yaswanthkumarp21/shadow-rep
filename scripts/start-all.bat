@echo off
rem Starts (or re-starts) everything. Safe to run any time - it never deletes data.
echo Starting the gym app...
cd /d "%~dp0..\apps\gym"      && docker compose up -d
echo Starting the food app...
cd /d "%~dp0..\apps\food"   && docker compose up -d
echo Starting the address proxy...
cd /d "%~dp0.."              && docker compose up -d
echo.
echo Done. Run smoke-test.bat to check that everything is healthy.
pause

