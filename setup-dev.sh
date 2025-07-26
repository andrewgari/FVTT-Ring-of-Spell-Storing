#!/bin/bash

# Ring of Spell Storing - Development Setup Script
# This script sets up the development environment with linting and git hooks

echo "🎯 Setting up Ring of Spell Storing development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo "📦 Installing development dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi

# Set up git hooks
echo "🪝 Setting up git hooks..."
git config core.hooksPath .githooks

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up git hooks."
    exit 1
fi

# Make hooks executable
chmod +x .githooks/*

# Run initial lint check
echo "🔍 Running initial lint check..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  Some linting issues found. You can fix them with:"
    echo "   npm run lint:fix"
    echo ""
    echo "   Or fix them manually before committing."
else
    echo "✅ All files passed linting!"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  npm run lint      - Check for linting issues"
echo "  npm run lint:fix  - Auto-fix linting issues"
echo ""
echo "The pre-commit hook will automatically run linting before each commit."
echo "To bypass the hook (not recommended), use: git commit --no-verify"
