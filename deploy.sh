#!/bin/bash

# =========================================================
# SV Bookstore - Telegram Mini App Auto-Deploy Script
# បណ្ណាគារ សៃវ៉ា (@svbookstorebot)
# =========================================================

echo "================================================="
echo "🚀 SV Bookstore - Automatic Deployment Starting..."
echo "================================================="

# Change to script directory
cd "$(dirname "$0")"

# Check if git is initialized
if [ ! -d ".git" ]; then
  echo "📦 Initializing Git repository..."
  git init
fi

# Ensure branch is main
git branch -M main

# Check if remote origin exists
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

if [ -z "$REMOTE_URL" ]; then
  echo ""
  echo "⚠️ មិនទាន់មាន GitHub Remote URL នៅឡើយទេ!"
  echo "👉 សូមបញ្ចូល GitHub Repository URL របស់លោកគ្រូ (ឧ. https://github.com/username/svbookstore.git):"
  read -r USER_REPO_URL
  if [ -n "$USER_REPO_URL" ]; then
    git remote add origin "$USER_REPO_URL"
    echo "✅ បានភ្ជាប់ទៅកាន់: $USER_REPO_URL"
  else
    echo "❌ មិនបានបញ្ចូល URL ទេ! សូមដំណើរការម្តងទៀតនៅពេលក្រោយ។"
    exit 1
  fi
fi

# Ask for optional commit message
COMMIT_MSG="Auto-deploy SV Bookstore - $(date '+%Y-%m-%d %H:%M:%S')"
if [ -n "$1" ]; then
  COMMIT_MSG="$1"
fi

echo "📝 Adding all updated files (index.html, products.js, config.js, etc.)..."
git add .

echo "💾 Committing changes: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG"

echo "☁️ Pushing to GitHub (main branch)..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "================================================="
  echo "🎉 DEPLOY SUCCESSFUL! ការបញ្ជូនកូដបានជោគជ័យ!"
  echo "================================================="
  echo "🌐 GitHub Actions ឬ Vercel កំពុង Auto-Deploy គេហទំព័ររបស់លោកគ្រូដោយស្វ័យប្រវត្តិ។"
  echo "📱 អតិថិជនទាំងអស់ក្នុង Telegram នឹងទទួលបានកំណែថ្មីក្នុងពេលបន្តិចទៀតនេះ!"
  echo "================================================="
else
  echo ""
  echo "❌ បរាជ័យក្នុងការ Push ទៅកាន់ GitHub! សូមពិនិត្យមើលសិទ្ធិ (Personal Access Token ឬ SSH Key) របស់ GitHub។"
fi
