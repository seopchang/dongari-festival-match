# =====================================================================
#  로컬 정적 서버 (PowerShell 전용 — Node도 Python도 필요 없다)
# =====================================================================
#  이 앱은 ES 모듈(<script type="module">)을 쓰기 때문에 index.html을
#  브라우저에 그냥 끌어다 놓으면 안 된다. file:// 에서는 모듈 로딩이
#  CORS로 막힌다. 그래서 진짜 HTTP로 내보내 준다.
#
#  실행:  powershell -ExecutionPolicy Bypass -File serve.ps1
#  중지:  Ctrl+C
# =====================================================================

param(
  [int]$Port = 8000,
  [string]$Root = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath($Root)

# 확장자 -> Content-Type.
# .js 를 text/javascript 로 정확히 내보내야 한다. 브라우저는 MIME이
# 틀리면 모듈 로딩 자체를 거부한다.
$mime = @{
  '.html'  = 'text/html; charset=utf-8'
  '.js'    = 'text/javascript; charset=utf-8'
  '.mjs'   = 'text/javascript; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.svg'   = 'image/svg+xml'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.gif'   = 'image/gif'
  '.webp'  = 'image/webp'
  '.ico'   = 'image/x-icon'
  '.woff'  = 'font/woff'
  '.woff2' = 'font/woff2'
  '.md'    = 'text/plain; charset=utf-8'
  '.rules' = 'text/plain; charset=utf-8'
  '.txt'   = 'text/plain; charset=utf-8'
}

$prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Output "!! $Port 포트를 열지 못했습니다: $($_.Exception.Message)"
  Write-Output "   이미 다른 프로그램이 쓰고 있으면 -Port 8080 처럼 다른 번호를 주세요."
  exit 1
}

Write-Output "SERVING  $Root"
Write-Output "참가자용  ${prefix}"
Write-Output "운영진용  ${prefix}admin/"
Write-Output "중지하려면 Ctrl+C"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  $status = 200
  $rel = ''

  try {
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')

    # /admin  ->  /admin/ 로 넘긴다.
    # 슬래시가 없으면 admin/index.html 안의 상대경로(admin.js, ../css/…)가
    # 한 단계 위에서 풀려서 전부 404가 난다.
    $maybeDir = Join-Path $Root ($rel -replace '/', '\')
    if ($rel -ne '' -and -not $rel.EndsWith('/') -and
        (Test-Path -LiteralPath $maybeDir -PathType Container)) {
      $res.StatusCode = 301
      $res.RedirectLocation = '/' + $rel + '/'
      $res.Close()
      Write-Output "301 /$rel -> /$rel/"
      continue
    }

    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel = $rel + 'index.html' }

    $full = [System.IO.Path]::GetFullPath((Join-Path $Root ($rel -replace '/', '\')))

    # ../ 로 폴더 밖을 훔쳐보는 걸 막는다
    if (-not $full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
      $status = 403
      $body = [Text.Encoding]::UTF8.GetBytes('403 forbidden')
      $res.ContentType = 'text/plain; charset=utf-8'
    } elseif (Test-Path -LiteralPath $full -PathType Leaf) {
      $body = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $res.ContentType = $ct
      # 고치자마자 새로고침하면 바로 보이게 캐시를 끈다
      $res.Headers.Add('Cache-Control', 'no-store')
    } else {
      $status = 404
      $body = [Text.Encoding]::UTF8.GetBytes("404 not found: /$rel")
      $res.ContentType = 'text/plain; charset=utf-8'
    }

    $res.StatusCode = $status
    $res.ContentLength64 = $body.Length
    $res.OutputStream.Write($body, 0, $body.Length)
  } catch {
    Write-Output "ERR /$rel  $($_.Exception.Message)"
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.Close() } catch {}
  }

  Write-Output "$status /$rel"
}
