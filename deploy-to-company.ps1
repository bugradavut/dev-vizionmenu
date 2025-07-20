# Deploy to Company Repository Script (PowerShell)
# Usage: .\deploy-to-company.ps1 "commit message"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment to company repository..." -ForegroundColor Green

try {
    # Make sure we're on main branch
    Write-Host "📍 Switching to main branch..." -ForegroundColor Cyan
    git checkout main

    # Pull latest changes from origin
    Write-Host "⬇️  Pulling latest changes from origin..." -ForegroundColor Cyan
    git pull origin main

    # Fetch latest from company repo
    Write-Host "📥 Fetching latest from company repository..." -ForegroundColor Cyan
    git fetch company

    # Check if everything is committed
    $status = git status --porcelain
    if ($status) {
        Write-Host "⚠️  You have uncommitted changes. Please commit or stash them first." -ForegroundColor Red
        git status --short
        exit 1
    }

    # Run tests (optional)
    Write-Host "🧪 Running tests..." -ForegroundColor Cyan
    pnpm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Tests failed. Deployment aborted." -ForegroundColor Red
        exit 1
    }

    # Build the project
    Write-Host "🔨 Building project..." -ForegroundColor Cyan
    pnpm build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed. Deployment aborted." -ForegroundColor Red
        exit 1
    }

    # Push to company repository
    Write-Host "📤 Pushing to company repository..." -ForegroundColor Cyan
    git push company main

    Write-Host "✅ Successfully deployed to company repository!" -ForegroundColor Green
    Write-Host "🌐 Company repo: https://github.com/vizionmenu/Food-Ordering-System" -ForegroundColor Yellow
    Write-Host "🔗 Dev site: https://dev-vizionmenu.vercel.app" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 