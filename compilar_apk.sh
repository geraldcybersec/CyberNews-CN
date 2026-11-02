#!/usr/bin/env bash
set -e
echo "==================================================="
echo "  CyberNews CN - Compilador Automático de APK"
echo "==================================================="
echo "[1/3] Instalando dependencias del proyecto..."
npm install
echo "[2/3] Verificando sesión en Expo EAS..."
npx eas-cli whoami || npx eas-cli login
echo "[3/3] Compilando archivo .APK instalable en la nube (perfil: preview)..."
npx eas-cli build --platform android --profile preview
