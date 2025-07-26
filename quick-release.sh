#!/bin/bash

# Ring of Spell Storing - Quick Release Script
# One-command release for common scenarios

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Ring of Spell Storing - Quick Release${NC}"
echo

# Default to patch release
VERSION_TYPE=${1:-patch}

echo -e "${GREEN}Creating $VERSION_TYPE release...${NC}"
echo

# Run the main release script
./scripts/release.sh $VERSION_TYPE

echo
echo -e "${GREEN}🎉 Quick release completed!${NC}"
echo -e "${BLUE}The GitHub Actions workflow will handle the rest automatically.${NC}"
