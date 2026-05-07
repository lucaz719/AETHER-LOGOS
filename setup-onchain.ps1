# AETHER-LOGOS — On-Chain Setup Verification Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   AETHER-LOGOS — On-Chain Submission Setup Verification" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$envFile = "agent/.env"

# 1. Check if .env exists
if (-not (Test-Path $envFile)) {
    Write-Host "[!] agent/.env not found. Please create it first." -ForegroundColor Red
    exit
}

# 2. Check for required variables
$envContent = Get-Content $envFile
$requiredVars = @("TRADE_ESCROW_PROGRAM_ID", "SOLANA_PRIVATE_KEY_BASE58")
$missing = @()

foreach ($var in $requiredVars) {
    if ($envContent -notmatch "^$var=") {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "[!] Missing variables in .env: $($missing -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host "[✓] All required variables are present in .env." -ForegroundColor Green
}

# 3. Verify Go environment
if (Get-Command "go" -ErrorAction SilentlyContinue) {
    Write-Host "[✓] Go is installed." -ForegroundColor Green
} else {
    Write-Host "[!] Go is not found in PATH." -ForegroundColor Red
}

# 4. Check for Reclaim Protocol vars
if ($envContent -match "MOCK_PROOF=true") {
    Write-Host "[i] Running in MOCK_PROOF mode. No real Reclaim credentials needed." -ForegroundColor Blue
} else {
    Write-Host "[i] Running in PRODUCTION mode. Ensure RECLAIM_APP_ID is set." -ForegroundColor Blue
}

Write-Host "`nReady for testing. Run 'cd agent; go run .' to start the agent." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
