@echo off
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 iniciar.py
    goto fin
)
python -c "import sys; sys.exit(sys.version_info.major != 3)" >nul 2>&1
if not errorlevel 1 (
    python iniciar.py
    goto fin
)
echo Para jugar en localhost, instala Python 3 desde https://www.python.org/downloads/windows/
:fin
pause
