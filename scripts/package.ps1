$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
function Assert-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed: $LASTEXITCODE" } }
$upstream = Get-Content upstream.json -Raw | ConvertFrom-Json
$archive = "artifacts/upstream/opencli-extension-v$($upstream.version).zip"
New-Item -ItemType Directory -Path artifacts/upstream -Force | Out-Null
if (-not (Test-Path -LiteralPath $archive)) { Invoke-WebRequest -Uri $upstream.url -OutFile $archive }
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $upstream.sha256) { throw 'Upstream archive checksum mismatch' }
# Always extract the checked archive into a fresh directory, never trust a cached tree.
$freshSource = Join-Path 'artifacts/upstream' ([guid]::NewGuid().ToString())
Expand-Archive -LiteralPath $archive -DestinationPath $freshSource
npm test
Assert-Exit
node scripts/build.mjs $freshSource dist/package-extension
Assert-Exit
node --check dist/package-extension/dist/background.js
Assert-Exit
python scripts/package.py $freshSource
Assert-Exit
