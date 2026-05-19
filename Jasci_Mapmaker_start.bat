@echo off
echo Starting JASCI MapMaker local server...
start "JASCI Server" cmd /k "python -m http.server 8080 || python3 -m http.server 8080"
timeout /t 2 /nobreak >nul
start http://localhost:8080/mapMaker/mapMaker.html
