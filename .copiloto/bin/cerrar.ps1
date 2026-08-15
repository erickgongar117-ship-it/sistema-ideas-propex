# Cierre de turno. Actualiza tu estado, escribe en la bitacora y suelta tu lock.
# Correr SIEMPRE al terminar, incluso si la tarea quedo a medias.
#
# IMPORTANTE: este script NO commitea tu codigo. Solo commitea .copiloto/BITACORA.md.
# Los commits de codigo los haces tu, a proposito y con rutas explicitas, porque en este
# repo conviven cambios de varios frentes y un `git add -A` se llevaria trabajo ajeno
# (ver la regla "no borres cambios no relacionados" en CLAUDE.md).
#
# Uso:
#   powershell -File .copiloto/bin/cerrar.ps1 -Agente claude `
#     -Hice "Unifique el calculo de ProbocaCoins" `
#     -Siguiente "Migrar src/app/(app)/entrenamientos/page.tsx: la query de la linea 34 usa Idea.points, que ya no existe"

param(
  [Parameter(Mandatory=$true)][string]$Hice,
  [Parameter(Mandatory=$true)][string]$Siguiente,
  [ValidateSet('claude','codex','antigravity','humano')][string]$Agente = 'claude',
  [string]$Tarea = '',
  [string]$Bloqueo = '',
  [string]$PorQue = '',
  [switch]$SinCommit
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_comun.ps1')
$raiz = Get-RepoRaiz
Set-Location $raiz
$runtime = Get-Runtime
$utf8 = Get-Utf8SinBom

if ($Siguiente.Length -lt 25) {
  Write-Host ""
  Write-Host "  AVISO: '-Siguiente' es demasiado vago." -ForegroundColor Yellow
  Write-Host "  Es la pieza mas importante del handoff: el otro agente lo lee SIN contexto previo." -ForegroundColor Yellow
  Write-Host "  Incluye archivo, funcion o linea, y que se espera lograr." -ForegroundColor Yellow
  Write-Host ""
}

$rama   = (git rev-parse --abbrev-ref HEAD)
$ahora  = Get-Date -Format 'yyyy-MM-dd HH:mm'
$fecha  = Get-Date -Format 'yyyy-MM-dd'
$estado = Join-Path $runtime "ESTADO-$Agente.md"
$bitac  = Join-Path $raiz '.copiloto\BITACORA.md'

# --- 1. Tu estado (compartido entre worktrees, uno por agente para que nadie se pise) ---
if (-not $Tarea -and (Test-Path $estado)) {
  $m = [regex]::Match([System.IO.File]::ReadAllText($estado), '(?ms)^## Tarea activa\s*$\r?\n(.*?)(?=^## )')
  if ($m.Success) { $Tarea = $m.Groups[1].Value.Trim() }
}
if (-not $Tarea) { $Tarea = '(sin definir)' }

$sinCommitear = @(git status --short).Count

$n = @()
$n += "# ESTADO de $Agente"
$n += ''
$n += "- **Actualizado:** $ahora"
$n += "- **Rama:** $rama"
$n += "- **Carpeta:** $raiz"
$n += "- **Turno:** cerrado"
$n += "- **Archivos sin commitear al cerrar:** $sinCommitear"
$n += ''
$n += '## Tarea activa'; $n += ''; $n += $Tarea; $n += ''
$n += '## Ultimo paso completado'; $n += ''; $n += $Hice
if ($PorQue) { $n += ''; $n += "Por que: $PorQue" }
$n += ''
$n += '## Siguiente paso'; $n += ''; $n += $Siguiente; $n += ''
$n += '## Bloqueos'; $n += ''; $n += $(if ($Bloqueo) { $Bloqueo } else { 'Ninguno.' }); $n += ''
[System.IO.File]::WriteAllText($estado, (($n -join "`r`n") + "`r`n"), $utf8)

# --- 2. Bitacora versionada: entrada nueva arriba ---
if (Test-Path $bitac) {
  $lineas = New-Object System.Collections.Generic.List[string]
  $lineas.AddRange([string[]][System.IO.File]::ReadAllLines($bitac))
  $corte = -1
  for ($i = 0; $i -lt $lineas.Count; $i++) { if ($lineas[$i].Trim() -eq '---') { $corte = $i; break } }
  $entrada = New-Object System.Collections.Generic.List[string]
  $entrada.Add(''); $entrada.Add("## $fecha -- $Agente ($rama) -- $Hice"); $entrada.Add('')
  if ($PorQue) { $entrada.Add("Por que: $PorQue"); $entrada.Add('') }
  $entrada.Add("Siguiente paso dejado: $Siguiente")
  if ($Bloqueo) { $entrada.Add(''); $entrada.Add("Bloqueo: $Bloqueo") }
  $entrada.Add(''); $entrada.Add('---')
  if ($corte -ge 0) { $lineas.InsertRange($corte + 1, $entrada) } else { $lineas.AddRange($entrada) }
  [System.IO.File]::WriteAllText($bitac, (($lineas -join "`r`n") + "`r`n"), $utf8)
}

# --- 3. Ledger compartido ---
Add-Evento $runtime $Agente 'fin' $Hice @()
if ($Bloqueo) { Add-Evento $runtime $Agente 'bloqueo' $Bloqueo @() }

# --- 4. Commit acotado: SOLO la bitacora, nunca tu codigo ---
if (-not $SinCommit) {
  $sucia = @(git status --short -- .copiloto/BITACORA.md)
  if ($sucia.Count -gt 0) {
    git add -- .copiloto/BITACORA.md
    git commit -q -m "[$Agente] bitacora: $Hice" -- .copiloto/BITACORA.md
    if ($LASTEXITCODE -eq 0) { Write-Host "bitacora commiteada" -ForegroundColor Green }
  }
}

# --- 5. Soltar lock ---
& (Join-Path $PSScriptRoot 'lock.ps1') -Agente $Agente -Soltar | Out-Null

Write-Host ""
Write-Host "  TURNO CERRADO -- $Agente  [$rama]" -ForegroundColor Cyan
Write-Host ("  Siguiente para quien retome: " + $Siguiente) -ForegroundColor White
if ($sinCommitear -gt 0) {
  Write-Host ""
  Write-Host "  OJO: quedan $sinCommitear archivos sin commitear en este worktree." -ForegroundColor Yellow
  Write-Host "  Si son tuyos y ya funcionan, commitealos con rutas explicitas:" -ForegroundColor Yellow
  Write-Host ('     git add -- <ruta1> <ruta2>   &&   git commit -m "[' + $Agente + '] ..."') -ForegroundColor DarkGray
}
Write-Host ""
