@echo off
cd /d "%~dp0"

:: Charger les variables depuis .env
for /f "tokens=1,* delims==" %%a in (.env) do set %%a=%%b

echo.
echo  =======================================
echo     DEKOD-IA - Publication en cours...
echo  =======================================
echo.

:: Commit et push git
git add .
git diff --cached --quiet
if %errorlevel% == 0 (
    echo  Aucune modification detectee.
) else (
    set TIMESTAMP=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2% %TIME:~0,5%
    git commit -m "mise a jour - %TIMESTAMP%"
    git push origin main
    echo.
)

:: Deploiement Netlify
echo  Deploiement sur Netlify...
"C:\Users\abdou\AppData\Roaming\npm\netlify.cmd" deploy --prod --dir=. --site=%NETLIFY_SITE_ID%
echo.
echo  =======================================
echo     Termine ! Site mis a jour en ligne.
echo  =======================================
echo.
pause
