#!/bin/bash

# Deploy to Company Repository Script
# Usage: ./deploy-to-company.sh "commit message"

set -e

echo "🚀 Starting deployment to company repository..."

# Check if commit message provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./deploy-to-company.sh 'your commit message'"
    exit 1
fi

COMMIT_MESSAGE="$1"

# Make sure we're on main branch
echo "📍 Switching to main branch..."
git checkout main

# Pull latest changes from origin
echo "⬇️  Pulling latest changes from origin..."
git pull origin main

# Fetch latest from company repo
echo "📥 Fetching latest from company repository..."
git fetch company

# Check if everything is committed
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
fi

# Run tests (optional)
echo "🧪 Running tests..."
npm run test || {
    echo "❌ Tests failed. Deployment aborted."
    exit 1
}

# Build the project
echo "🔨 Building project..."
npm run build || {
    echo "❌ Build failed. Deployment aborted."
    exit 1
}

# Push to company repository
echo "📤 Pushing to company repository..."
git push company main

echo "✅ Successfully deployed to company repository!"
echo "🌐 Company repo: https://github.com/vizionmenu/Food-Ordering-System"
echo "🔗 Dev site: https://dev-vizionmenu.vercel.app" 