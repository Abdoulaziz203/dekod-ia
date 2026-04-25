@echo off
cd /d "%~dp0"
echo.
echo  =======================================
echo     DEKOD-IA - Publication en cours...
echo  =======================================
echo.
git add .
git diff --cached --quiet
if %errorlevel% == 0 (
    echo  Aucune modification detectee.
    echo  Le site est deja a jour.
    echo.
    pause
    exit /b 0
)
set TIMESTAMP=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2% %TIME:~0,5%
git commit -m "mise a jour - %TIMESTAMP%"
git push origin main
echo.
echo  =======================================
echo     Publication terminee !
echo     Netlify met a jour le site
echo     automatiquement dans 1 a 2 min.
echo  =======================================
echo.
pause
