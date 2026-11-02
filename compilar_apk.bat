@echo off
echo ===================================================
echo   CyberNews CN - Compilador Automatico de APK
echo ===================================================
echo.
echo [1/3] Instalando dependencias del proyecto...
call npm install
echo.
echo [2/3] Verificando sesion en Expo EAS (crea una cuenta gratis si no tienes)...
call npx eas-cli whoami || call npx eas-cli login
echo.
echo [3/3] Compilando archivo .APK instalable en la nube (perfil: preview)...
call npx eas-cli build --platform android --profile preview
echo.
echo Listo! Abre el enlace generado arriba o escanea el codigo QR desde tu Android para descargar e instalar el .APK.
pause
