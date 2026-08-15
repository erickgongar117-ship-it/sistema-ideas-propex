# Funciones compartidas por los scripts de turno.
# Se carga con:  . (Join-Path $PSScriptRoot '_comun.ps1')

function Get-RepoRaiz {
  # La raiz del worktree actual (cada agente tiene el suyo).
  (git rev-parse --path-format=absolute --show-toplevel)
}

function Get-Runtime {
  # Estado vivo COMPARTIDO entre todos los worktrees.
  #
  # Por que aqui y no en el repo: los archivos ignorados por git NO se comparten entre
  # worktrees (cada carpeta tiene los suyos), asi que un ledger dentro del proyecto seria
  # invisible para el otro agente. En cambio .git/ es comun a todos los worktrees, asi que
  # lo que vive ahi lo ven los dos, sin importar en que rama este cada uno.
  $comun = (git rev-parse --path-format=absolute --git-common-dir)
  $dir = Join-Path $comun 'copiloto'
  New-Item -ItemType Directory -Force -Path $dir, (Join-Path $dir 'locks') | Out-Null
  $dir
}

function Get-Utf8SinBom { New-Object System.Text.UTF8Encoding($false) }

function Add-Evento($runtime, $agente, $tipo, $que, $archivos) {
  $e = [ordered]@{
    ts       = [datetime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    agente   = $agente
    tipo     = $tipo
    rama     = (git rev-parse --abbrev-ref HEAD)
    worktree = (Split-Path (Get-RepoRaiz) -Leaf)
    que      = $que
    archivos = ($archivos -join ' ')
  }
  $linea = ($e | ConvertTo-Json -Compress) + "`n"
  [System.IO.File]::AppendAllText((Join-Path $runtime 'eventos.jsonl'), $linea, (Get-Utf8SinBom))
}
