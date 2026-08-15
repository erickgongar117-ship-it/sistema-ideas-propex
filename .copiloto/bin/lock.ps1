# Toma o suelta el lock de trabajo de un agente. El lock es COMPARTIDO entre worktrees.
# Tomar:  powershell -File .copiloto/bin/lock.ps1 -Agente claude -Areas "src/lib" -Nota "migrando puntos"
# Soltar: powershell -File .copiloto/bin/lock.ps1 -Agente claude -Soltar

param(
  [ValidateSet('claude','codex','antigravity','humano')][string]$Agente = 'claude',
  [string[]]$Areas = @(),
  [string]$Nota = '',
  [switch]$Soltar
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_comun.ps1')
$runtime = Get-Runtime
$mio = Join-Path $runtime "locks\$Agente.lock"

if ($Soltar) {
  if (Test-Path $mio) { Remove-Item $mio -Force; Write-Host "lock de $Agente liberado" -ForegroundColor Green }
  else { Write-Host "$Agente no tenia lock" -ForegroundColor DarkGray }
  exit 0
}

if ($Areas.Count -eq 0) { $Areas = @('todo el repo') }

$ajenos = @(Get-ChildItem (Join-Path $runtime 'locks') -Filter *.lock -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ne "$Agente.lock" })
if ($ajenos.Count -gt 0) {
  Write-Host ""
  Write-Host "  CUIDADO: hay locks de otros agentes vigentes" -ForegroundColor Red
  foreach ($a in $ajenos) {
    $d = Get-Content $a.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $edad = [int]([datetime]::UtcNow - ([datetime]$d.ts).ToUniversalTime()).TotalMinutes
    Write-Host ("    " + $d.agente + " [" + $d.rama + "] -> " + ($d.areas -join ', ') + "  (hace $edad min)") -ForegroundColor Red
  }
  Write-Host "  Si van a tocar los mismos archivos, confirma con el usuario antes de seguir." -ForegroundColor Yellow
  Write-Host ""
}

$lock = [ordered]@{
  agente   = $Agente
  ts       = [datetime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
  rama     = (git rev-parse --abbrev-ref HEAD)
  worktree = (Get-RepoRaiz)
  areas    = $Areas
  nota     = $Nota
}
[System.IO.File]::WriteAllText($mio, ($lock | ConvertTo-Json -Compress), (Get-Utf8SinBom))
Write-Host ("lock tomado por " + $Agente + ": " + ($Areas -join ', ')) -ForegroundColor Green
