# Instala los hooks de git. Los hooks no viajan dentro de git, asi que hay que correr esto
# una vez por clon. En un repo con worktrees basta UNA vez: los hooks viven en el .git
# comun y cubren todos los worktrees.
# Uso: powershell -File .copiloto/bin/instalar-hooks.ps1

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_comun.ps1')
$origen  = Join-Path (Split-Path $PSScriptRoot -Parent) 'hooks'
$destino = (git rev-parse --path-format=absolute --git-path hooks)
New-Item -ItemType Directory -Force -Path $destino | Out-Null

foreach ($h in Get-ChildItem $origen -File) {
  $texto = [System.IO.File]::ReadAllText($h.FullName) -replace "`r`n", "`n"   # sh necesita LF
  [System.IO.File]::WriteAllText((Join-Path $destino $h.Name), $texto, (Get-Utf8SinBom))
  Write-Host ("hook instalado: " + $h.Name) -ForegroundColor Green
}
Write-Host ("destino: " + $destino) -ForegroundColor DarkGray
Write-Host "cubre todos los worktrees de este repo" -ForegroundColor DarkGray
