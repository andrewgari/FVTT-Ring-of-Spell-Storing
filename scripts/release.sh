#!/bin/bash

# Ring of Spell Storing - Release Script
# Automates the release process with version bumping and validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "module.json" ]; then
    log_error "module.json not found. Please run this script from the project root."
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    log_error "Git working directory is not clean. Please commit or stash changes first."
    git status --short
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./module.json').version" 2>/dev/null || echo "0.0.0")
log_info "Current version: $CURRENT_VERSION"

# Parse version type argument
VERSION_TYPE=${1:-patch}

if [ "$VERSION_TYPE" != "patch" ] && [ "$VERSION_TYPE" != "minor" ] && [ "$VERSION_TYPE" != "major" ]; then
    log_error "Invalid version type. Use: patch, minor, or major"
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]:-0}
MINOR=${VERSION_PARTS[1]:-0}
PATCH=${VERSION_PARTS[2]:-0}

case "$VERSION_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
log_info "New version will be: $NEW_VERSION"

# Confirm with user
echo
read -p "Do you want to create release v$NEW_VERSION? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Release cancelled."
    exit 0
fi

# Run pre-release checks
log_info "Running pre-release checks..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log_error "npm not found. Please install Node.js and npm."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log_info "Installing dependencies..."
    npm install
fi

# Run linting
log_info "Running ESLint..."
if ! npm run lint; then
    log_error "Linting failed. Please fix the issues before releasing."
    exit 1
fi
log_success "Linting passed"

# Validate module.json
log_info "Validating module.json..."
if ! node -e "JSON.parse(require('fs').readFileSync('module.json', 'utf8'))"; then
    log_error "module.json is not valid JSON"
    exit 1
fi
log_success "module.json is valid"

# Update version in files
log_info "Updating version in files..."
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" module.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json

# Clean up backup files
rm -f module.json.bak package.json.bak

log_success "Version updated to $NEW_VERSION"

# Commit changes
log_info "Committing version bump..."
git add module.json package.json
git commit -m "Bump version to $NEW_VERSION"

# Create and push tag
log_info "Creating and pushing tag..."
git tag "v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

log_success "Release v$NEW_VERSION created successfully!"
log_info "GitHub Actions will automatically create the release and build artifacts."
log_info "Check the Actions tab: https://github.com/andrewgari/FVTT-Ring-of-Spell-Storing/actions"

echo
log_success "🎉 Release process completed!"
echo -e "${BLUE}📦 Release: v$NEW_VERSION${NC}"
echo -e "${BLUE}🔗 GitHub: https://github.com/andrewgari/FVTT-Ring-of-Spell-Storing/releases/tag/v$NEW_VERSION${NC}"
