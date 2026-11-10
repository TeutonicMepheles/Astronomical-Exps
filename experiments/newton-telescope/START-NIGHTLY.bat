@echo off
cd /d "%~dp0\..\.."
echo Newton Step2 nightly preview - close this window to stop the server.
start "" "http://127.0.0.1:8797/experiments/newton-telescope/"
python -m http.server 8797 --bind 127.0.0.1
pause
