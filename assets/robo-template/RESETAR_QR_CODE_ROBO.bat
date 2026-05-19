@echo off
cd /d "%~dp0\robo-whatsapp"
if exist .wwebjs_auth rmdir /s /q .wwebjs_auth
if exist .wwebjs_cache rmdir /s /q .wwebjs_cache
echo QR Code resetado. Abra o robo novamente e leia o novo QR.
pause
