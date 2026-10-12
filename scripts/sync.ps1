param(
    [string]$Message = "Auto-sync: Yenilənmələr və təkmilləşdirmələr"
)

$ErrorActionPreference = "Stop"

$env:Path = "C:\Users\alial\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd;C:\Users\alial\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\mingw64\bin;" + $env:Path

$repoDir = Split-Path -Parent $PSScriptRoot
Set-Location $repoDir

$status = git status --porcelain
if ($status) {
    Write-Output "Dəyişikliklər aşkar edildi. GitHub-a göndərilir..."
    git add -A
    git commit -m $Message
    git push origin main
    Write-Output "Uğurla GitHub-a göndərildi (pushed)!"
} else {
    Write-Output "Heç bir yeni dəyişiklik yoxdur, hər şey aktualdır."
}
