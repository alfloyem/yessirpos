# ============================================================
# YesSir POS - Auto Release Script
# Usage: .\release.ps1
# Requires: GitHub CLI (gh) installed and authenticated
# ============================================================

# --- CONFIG ---
$GITHUB_REPO = "alfloyem/yessirpos-vue"
$PRIVATE_KEY_PATH = "src-tauri/signing.key.fixed"

# --- READ CURRENT VERSION ---
$tauriConf = Get-Content "src-tauri/tauri.conf.json" | ConvertFrom-Json
$currentVersion = $tauriConf.version
Write-Host ""
Write-Host "Current version: v$currentVersion"

# --- ASK FOR NEW VERSION ---
$newVersion = Read-Host "Enter new version (e.g. 0.1.8) [leave blank to keep $currentVersion]"
if ([string]::IsNullOrWhiteSpace($newVersion)) {
    $newVersion = $currentVersion
} else {
    # Update tauri.conf.json
    $tauriConfRaw = Get-Content "src-tauri/tauri.conf.json" -Raw
    $tauriConfRaw = $tauriConfRaw -replace '"version": "[^"]*"', "`"version`": `"$newVersion`""
    Set-Content "src-tauri/tauri.conf.json" $tauriConfRaw -NoNewline

    # Update Cargo.toml
    $cargoRaw = Get-Content "src-tauri/Cargo.toml" -Raw
    $cargoRaw = [regex]::Replace($cargoRaw, '(?m)^version = "[^"]*"', "version = `"$newVersion`"")
    Set-Content "src-tauri/Cargo.toml" $cargoRaw -NoNewline

    Write-Host "Version bumped to v$newVersion"
}

# --- ASK FOR RELEASE NOTES ---
$releaseNotes = Read-Host "Release notes (leave blank for 'Bug fixes and improvements')"
if ([string]::IsNullOrWhiteSpace($releaseNotes)) {
    $releaseNotes = "Bug fixes and improvements"
}

# --- LOAD PRIVATE KEY ---
if (-not (Test-Path $PRIVATE_KEY_PATH)) {
    Write-Host "ERROR: Private key not found at $PRIVATE_KEY_PATH" -ForegroundColor Red
    exit 1
}
$privateKey = (Get-Content $PRIVATE_KEY_PATH -Raw).Trim()

# --- BUILD ---
Write-Host ""
Write-Host "Building v$newVersion..." -ForegroundColor Cyan
$env:TAURI_SIGNING_PRIVATE_KEY = $privateKey
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

pnpm tauri build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# --- FIND ARTIFACTS ---
$msiPath = "src-tauri/target/release/bundle/msi/yessirpos_${newVersion}_x64_en-US.msi"
$sigPath  = "src-tauri/target/release/bundle/msi/yessirpos_${newVersion}_x64_en-US.msi.sig"

if (-not (Test-Path $msiPath)) {
    Write-Host "ERROR: MSI not found: $msiPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $sigPath)) {
    Write-Host "ERROR: Signature not found: $sigPath" -ForegroundColor Red
    exit 1
}

$signature = Get-Content $sigPath -Raw
$signature = $signature.Trim()

# --- UPDATE update.json ---
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$updateJson = @{
    version  = $newVersion
    notes    = $releaseNotes
    pub_date = $pubDate
    platforms = @{
        "windows-x86_64" = @{
            signature = $signature
            url       = "https://github.com/$GITHUB_REPO/releases/download/v$newVersion/yessirpos_${newVersion}_x64_en-US.msi"
        }
    }
} | ConvertTo-Json -Depth 5

Set-Content "update.json" $updateJson
Write-Host "update.json updated" -ForegroundColor Green

# --- GIT COMMIT & TAG ---
Write-Host ""
Write-Host "Committing and tagging..." -ForegroundColor Cyan
git add update.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "release: v$newVersion"
git tag "v$newVersion"
git push origin master
git push origin "v$newVersion"

# --- GITHUB RELEASE ---
Write-Host ""
Write-Host "Creating GitHub release v$newVersion..." -ForegroundColor Cyan
gh release create "v$newVersion" `
    $msiPath `
    --repo $GITHUB_REPO `
    --title "v$newVersion" `
    --notes $releaseNotes

if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub release failed. Make sure 'gh' CLI is installed and authenticated." -ForegroundColor Red
    Write-Host "Install: winget install GitHub.cli  then: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Release v$newVersion published successfully!" -ForegroundColor Green
Write-Host "Update endpoint: https://raw.githubusercontent.com/$GITHUB_REPO/master/update.json" -ForegroundColor Cyan