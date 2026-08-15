# Registra un hito del turno en el ledger compartido entre worktrees.
# Uso: powershell -File .copiloto/bin/registrar.ps1 -Agente claude -Que "Migre lib/points.ts" -Archivos "src/lib/points.ts"

param(
  [Parameter(Mandatory=$true)][string]$Que,
  [ValidateSet('claude','codex','antigravity','humano')][string]$Agente = 'claude',
  [ValidateSet('paso','decision','bloqueo','nota','inicio','fin')][string]$Tipo = 'paso',
  [string[]]$Archivos = @()
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_comun.ps1')
Add-Evento (Get-Runtime) $Agente $Tipo $Que $Archivos

$color = switch ($Tipo) { 'bloqueo' { 'Red' } 'decision' { 'Yellow' } default { 'Green' } }
Write-Host ("registrado [$Agente/$Tipo] " + $Que) -ForegroundColor $color
if ($Tipo -eq 'decision') {
  Write-Host "  recuerda: las decisiones de arquitectura tambien van en .copiloto/DECISIONES.md" -ForegroundColor DarkGray
}
