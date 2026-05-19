@echo off
setlocal EnableExtensions
set "BASE=%~dp0"
set "ROBO=%BASE%robo-whatsapp"
set "RUNTIME=%BASE%runtime\node"
set "NODE_EXE="
set "NPM_CMD="

if exist "%RUNTIME%\node.exe" (
  set "NODE_EXE=%RUNTIME%\node.exe"
  set "NPM_CMD=%RUNTIME%\npm.cmd"
) else (
  for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
  for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%N"
)

if not defined NODE_EXE (
  echo Node.js nao encontrado. Baixando Node.js LTS portatil para esta pasta...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $base='%BASE%runtime'; $nodeDir=Join-Path $base 'node'; New-Item -ItemType Directory -Force -Path $base | Out-Null; $idx=Invoke-RestMethod 'https://nodejs.org/dist/index.json'; $v=($idx | Where-Object { $_.lts } | Select-Object -First 1).version; $zip=Join-Path $base 'node.zip'; $url='https://nodejs.org/dist/'+$v+'/node-'+$v+'-win-x64.zip'; Invoke-WebRequest $url -OutFile $zip; if(Test-Path $nodeDir){Remove-Item $nodeDir -Recurse -Force}; New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null; Expand-Archive $zip -DestinationPath $base -Force; $src=Get-ChildItem $base -Directory | Where-Object { $_.Name -like 'node-*-win-x64' } | Select-Object -First 1; Move-Item (Join-Path $src.FullName '*') $nodeDir -Force; Remove-Item $src.FullName -Recurse -Force; Remove-Item $zip -Force"
  if errorlevel 1 (
    echo Falha ao baixar Node.js portatil. Verifique internet ou bloqueio de seguranca do Windows.
    pause
    exit /b 1
  )
  set "NODE_EXE=%RUNTIME%\node.exe"
  set "NPM_CMD=%RUNTIME%\npm.cmd"
)

if not exist "%NODE_EXE%" (
  echo Node.js nao foi localizado apos a instalacao automatica.
  pause
  exit /b 1
)

cd /d "%ROBO%"
if not exist node_modules (
  echo Instalando dependencias do robo WhatsApp...
  call "%NPM_CMD%" install --no-audit --no-fund
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

start "valorIA robo" cmd /k ""%NODE_EXE%" server.js"
timeout /t 3 >nul
start http://localhost:3010
endlocal
