## [1.0.15] - 2025-07-26

### Changes
- Restore CHANGELOG.md and update .gitignore%0A- Remove unnecessary markdown files from repository%0A- Fix Ring of Spell Storing UI rendering issues

## [1.0.14] - 2025-07-26

### Changes
- 🔧 Enhance Ring of Spell Storing: Support multiple rings and improve spell management UI

## [1.0.13] - 2025-07-26

### Changes
- 🔧 Enhance Ring of Spell Storing: Add spell list integration and UI for managing ring spells

## [1.0.12] - 2025-07-26

### Changes
- 🔧 Add diagnostics for Ring of Spell Storing module

## [1.0.11] - 2025-07-26

### Changes
- 🔧 Add integration and unit tests for Ring of Spell Storing functionality

## [1.0.10] - 2025-07-26

### Changes
Initial release

## [1.0.9] - 2025-07-26

### Changes
- 📝 Add workflow status confirmation to README%0A- 🔧 Fix GitHub Actions workflow failures%0A- 🧹 Remove unnecessary manual scripts - GitHub Actions handles everything%0A- 🔧 Fix ESLint issues in test files

## [1.0.8] - 2025-07-26

### Changes
- 🔧 Fix git hook and JavaScript validation issues%0A- 🔧 Enhanced auto-release to support both direct pushes and PR merges%0A- 🚀 Add automatic release on main push + clean release names%0A- 🔧 Enhanced ring update with multiple approaches + Foundry v13 support%0A- 🔧 Fix ring data persistence issue - root cause identified

## [1.0.7] - 2025-07-26

### Changes
Initial release

## [1.0.6] - 2025-07-26

### Changes
Initial release

## [1.0.5] - 2025-07-26

### Changes
Initial release

## [1.0.4] - 2025-07-26

### Changes
Initial release

## [1.0.3] - 2025-07-26

### Changes
Initial release

## [1.0.2] - 2025-07-26

### Changes
Initial release

# Changelog

All notable changes to the Ring of Spell Storing module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-26

### Added
- Initial release of Ring of Spell Storing module
- Complete spell storage system with 5-level capacity
- Original caster statistics tracking (spell attack bonus, save DC)
- Intuitive UI interface for ring management
- Visual capacity bar showing used/remaining spell levels
- Spell storage mechanics for any spellcaster
- Spell casting using original caster's statistics
- Ring transfer support between characters
- Persistent data storage across sessions
- Configuration settings for interface display and self-targeting spells
- Permission system for different user roles
- API for other modules to interact with ring functionality
- Comprehensive localization support (English)
- Chat card display for ring information
- Confirmation dialogs for spell actions
- Support for Foundry VTT v12+ and D&D 5e system v3.0.0+

### Features
- **Core Functionality**
  - 5-level spell slot capacity system
  - Original caster statistics preservation
  - UI panel showing current storage state
  - Spell casting with original caster's stats

- **Storage Mechanics**
  - Any spellcaster can store spells
  - Support for all spell levels 1-5
  - Optional self-targeting spell support
  - Remaining capacity display
  - Spell details with caster information

- **Casting Interface**
  - Cast spells from ring interface or character sheet
  - Visual indication of ring spells vs character spells
  - Automatic spell removal after casting
  - Confirmation dialogs for safety

- **Transfer/Ownership**
  - Ring transfer between players
  - Preserved spell data during transfers
  - Non-owner spell storage capability
  - Proper permission handling

- **Technical Features**
  - Foundry VTT v12+ compatibility
  - D&D 5e system integration
  - Persistent data storage
  - Module API for extensibility
  - Comprehensive error handling
  - Responsive UI design

### Documentation
- Complete README with installation and usage instructions
- API documentation for developers
- Troubleshooting guide
- Configuration options explanation
- License and credits information

### Development
- GitHub repository setup with automated releases
- GitHub Actions for validation and release management
- Proper module.json configuration for GitHub installation
- Repository: https://github.com/andrewgari/FVTT-Ring-of-Spell-Storing
- MIT License
