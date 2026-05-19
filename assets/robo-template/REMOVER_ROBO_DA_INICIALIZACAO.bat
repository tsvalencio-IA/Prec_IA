@echo off
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\valorIA_ROBO.lnk"
if exist "%LNK%" del "%LNK%"
echo Inicializacao automatica removida.
pause
