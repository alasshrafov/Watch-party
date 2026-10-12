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

# Render Avtomatik Deploy Tətiyi (Deploy Hook)
$deployHook = "https://api.render.com/deploy/srv-db5asv7lk1mc739bph2g?key=Gkj1c80cljc"
try {
    Write-Output "Render avtomatik deploy tətiklənir..."
    $res = Invoke-RestMethod -Uri $deployHook -Method Post
    Write-Output "Render deploy uğurla başladıldı! ID: $($res.deploy.id)"
} catch {
    Write-Warning "Render deploy hook xətası: $_"
}
