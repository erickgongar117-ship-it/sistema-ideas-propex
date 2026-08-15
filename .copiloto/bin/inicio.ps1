# Arranque de turno. Muestra todo lo necesario para retomar sin contexto previo,
# incluido lo que esta haciendo el OTRO agente en su propio worktree.
# Uso:  powershell -File .copiloto/bin/inicio.ps1

$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot '_comun.ps1')
$raiz = Get-RepoRaiz
Set-Location $raiz
$runtime = Get-Runtime

function Titulo($t) {
  Write-Host ""
  Write-Host ("-" * 76) -ForegroundColor DarkGray
  Write-Host "  $t" -ForegroundColor Cyan
  Write-Host ("-" * 76) -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  ARRANQUE DE TURNO -- PROpEx" -ForegroundColor White
Write-Host ("  Worktree: " + $raiz) -ForegroundColor DarkGray
Write-Host ("  Rama:     " + (git rev-parse --abbrev-ref HEAD)) -ForegroundColor DarkGray

Titulo "WORKTREES Y RAMAS  (quien esta donde)"
$lineas = git worktree list --porcelain
$wt = @(); $actual = $null
foreach ($l in $lineas) {
  if ($l -like 'worktree *') { if ($actual) { $wt += $actual }; $actual = @{ ruta = $l.Substring(9) } }
  elseif ($l -like 'branch *') { $actual.rama = $l.Substring(7) -replace '^refs/heads/', '' }
}
if ($actual) { $wt += $actual }
foreach ($w in $wt) {
  $esteEs = if ($w.ruta.Replace('/', '\') -eq $raiz.Replace('/', '\')) { ' <- estas aqui' } else { '' }
  Write-Host ("  " + $w.rama + $esteEs) -ForegroundColor $(if ($esteEs) { 'Green' } else { 'Gray' })
  Write-Host ("     " + $w.ruta) -ForegroundColor DarkGray
  # Trabajo a medias en CADA worktree, no solo en el tuyo: es lo que necesitas ver
  # cuando el otro agente quedo parado y hay que retomarlo.
  if (-not $esteEs) {
    $suSt = @(git -C $w.ruta status --short 2>$null)
    if ($suSt.Count -gt 0) {
      $suMod = @($suSt | Where-Object { $_ -notlike '`?`?*' }).Count
      Write-Host ("     trabajo a medias ahi: $suMod modificados, " + ($suSt.Count - $suMod) + " sin rastrear") -ForegroundColor Yellow
      Write-Host ("     para verlo:  git -C `"" + $w.ruta + "`" status --short") -ForegroundColor DarkGray
    } else {
      Write-Host "     arbol limpio ahi" -ForegroundColor DarkGray
    }
  }
  # Que tan atrasada esta esta rama respecto a las demas ramas activas
  foreach ($otra in $wt) {
    if ($otra.rama -eq $w.rama) { continue }
    $atras = (git rev-list --count "$($w.rama)..$($otra.rama)" 2>$null)
    if ($atras -and [int]$atras -gt 0) {
      $color = if ([int]$atras -gt 10) { 'Yellow' } else { 'DarkGray' }
      Write-Host ("     le faltan $atras commits de " + $otra.rama) -ForegroundColor $color
    }
  }
}

Titulo "ESTADO DE CADA AGENTE  (compartido entre worktrees)"
$estados = @(Get-ChildItem $runtime -Filter 'ESTADO-*.md' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
if ($estados.Count -eq 0) {
  Write-Host "  (todavia nadie ha cerrado un turno)" -ForegroundColor DarkGray
} else {
  foreach ($e in $estados) {
    Write-Host ""
    Write-Host ("  === " + $e.BaseName.Replace('ESTADO-', '').ToUpper() + " ===") -ForegroundColor White
    Get-Content $e.FullName -Encoding UTF8 | ForEach-Object { Write-Host "  $_" }
  }
}

Titulo "LOCKS VIGENTES"
$locks = @(Get-ChildItem (Join-Path $runtime 'locks') -Filter *.lock -ErrorAction SilentlyContinue)
if ($locks.Count -eq 0) {
  Write-Host "  ninguno: nadie tiene areas tomadas" -ForegroundColor Green
} else {
  foreach ($l in $locks) {
    try {
      $d = Get-Content $l.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
      $edad = [int]([datetime]::UtcNow - ([datetime]$d.ts).ToUniversalTime()).TotalMinutes
      Write-Host ("  " + $d.agente + " [" + $d.rama + "] tiene tomado: " + ($d.areas -join ', ') + "   (hace $edad min)") -ForegroundColor $(if ($edad -gt 120) { 'Yellow' } else { 'Red' })
      if ($d.nota) { Write-Host ("     nota: " + $d.nota) -ForegroundColor DarkGray }
      if ($edad -gt 120) {
        Write-Host "     lock viejo: es probable que ese agente quedara parado." -ForegroundColor Yellow
        Write-Host ("     Confirma con el usuario y libera con:  .copiloto/bin/lock.ps1 -Agente " + $d.agente + " -Soltar") -ForegroundColor DarkGray
      }
    } catch { Write-Host ("  lock ilegible: " + $l.Name) -ForegroundColor Red }
  }
}

Titulo "CAMBIOS SIN COMMITEAR EN ESTE WORKTREE"
$st = @(git status --short)
if ($st.Count -eq 0) {
  Write-Host "  arbol limpio" -ForegroundColor Green
} else {
  $mod = @($st | Where-Object { $_ -notlike '`?`?*' })
  $new = @($st | Where-Object { $_ -like '`?`?*' })
  Write-Host ("  " + $mod.Count + " archivo(s) modificados, " + $new.Count + " sin rastrear")
  $mod | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
  if ($mod.Count -gt 20) { Write-Host ("  ... y " + ($mod.Count - 20) + " mas") -ForegroundColor DarkGray }
  Write-Host ""
  Write-Host "  Si este trabajo a medias NO es tuyo: no lo pises ni lo borres." -ForegroundColor Yellow
  Write-Host "  Para entenderlo:  git diff        Para guardarlo sin perderlo:  git stash" -ForegroundColor DarkGray
}

Titulo "ULTIMOS 12 EVENTOS  (de todos los agentes)"
$log = Join-Path $runtime 'eventos.jsonl'
if (Test-Path $log) {
  Get-Content $log -Tail 12 -Encoding UTF8 | ForEach-Object {
    try {
      $e = $_ | ConvertFrom-Json
      Write-Host ("  {0}  {1,-7} {2,-8} {3}" -f ([datetime]$e.ts).ToString('MM-dd HH:mm'), $e.agente, $e.tipo, $e.que)
    } catch { Write-Host "  $_" }
  }
} else { Write-Host "  (sin eventos todavia)" -ForegroundColor DarkGray }

Titulo "ULTIMOS 5 COMMITS DE ESTA RAMA"
git log -5 --format="  %h  %ad  %s" --date=format:"%m-%d %H:%M" 2>$null | ForEach-Object { Write-Host $_ }

Titulo "COMO SEGUIR"
Write-Host "  1. Lee el 'Siguiente paso' del estado de arriba. Ahi esta donde continuar."
Write-Host "  2. Reglas de producto y despliegue: CLAUDE.md.  Protocolo: .copiloto/PROTOCOLO.md"
Write-Host "  3. Toma tu lock:"
Write-Host '     powershell -File .copiloto/bin/lock.ps1 -Agente <claude|codex> -Areas "src/lib"' -ForegroundColor DarkGray
Write-Host "  4. Al terminar, SIEMPRE cierra el turno:"
Write-Host '     powershell -File .copiloto/bin/cerrar.ps1 -Agente <claude|codex> -Hice "..." -Siguiente "..."' -ForegroundColor DarkGray
Write-Host ""
