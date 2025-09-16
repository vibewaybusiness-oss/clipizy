@echo off
REM Simple RunPod SSH wrapper
REM Usage: runpod.bat [command]

set USERHOST=5m9ywn3ljhdlxt-64411155@ssh.runpod.io
set KEY_PATH=.\runpod_api_key

if "%1"=="" (
    echo Starting interactive RunPod shell...
    echo Type 'exit' to quit
    echo.
    ssh -i %KEY_PATH% -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -tt %USERHOST%
) else (
    echo Running command: %*
    ssh -i %KEY_PATH% -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -tt %USERHOST% "bash -c '%*'"
)















