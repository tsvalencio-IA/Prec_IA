@echo off
setlocal
set "BAT=%~dp0INSTALAR_E_ABRIR_ROBO_VALORIA.bat"
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\valorIA_ROBO.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%LNK%');$s.TargetPath='%BAT%';$s.WorkingDirectory='%~dp0';$s.Save()"
echo Robo valor_IA configurado para iniciar com Windows.
pause
endlocal
