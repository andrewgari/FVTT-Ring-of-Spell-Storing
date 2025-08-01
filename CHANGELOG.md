## [1.0.38] - 2025-07-30

### Changes
- Enhance stored spells retrieval process with multiple fallback methods and improved logging

## [1.0.37] - 2025-07-30

### Changes
- Refactor ring data update process to utilize setFlag method and improve error handling during updates

## [1.0.36] - 2025-07-30

### Changes
- Refactor ring data update process to improve logging and error handling during spell storage

## [1.0.35] - 2025-07-30

### Changes
- Enhance ring data retrieval with additional logging and implement spell slot consumption and restoration methods

## [1.0.34] - 2025-07-30

### Changes
- Enhance ring data update process with additional logging for embedded document updates and alternative update approaches

## [1.0.33] - 2025-07-30

### Changes
- Enhance ring data retrieval with comprehensive logging for data location checks

## [1.0.32] - 2025-07-30

### Changes
- Enhance ring data update process with additional logging for module API checks and update results

## [1.0.31] - 2025-07-30

### Changes
- Refactor ring data update process to utilize main module API and improve error handling

## [1.0.30] - 2025-07-30

### Changes
- Enhance ring data retrieval with additional logging and post-storage verification

## [1.0.29] - 2025-07-30

### Changes
- Enhance ring data retrieval with improved validation and error handling

## [1.0.28] - 2025-07-30

### Changes
- Refactor ring spell data retrieval and update methods for improved compatibility with ring-interface.js

## [1.0.27] - 2025-07-30

### Changes
- Refactor ring spell data management for improved compatibility and error handling

## [1.0.26] - 2025-07-30

### Changes
- Ensure jQuery compatibility for HTML elements in ring management functions

## [1.0.25] - 2025-07-30

### Changes
- Enhance item sheet integration and compatibility for Ring of Spell Storing

## [1.0.24] - 2025-07-30

### Changes
- Fix module initialization and ring detection issues

## [1.0.23] - 2025-07-30

### Changes
- Add context menu test function%0A- MAJOR: Implement context menu system for Ring of Spell Storing

## [1.0.22] - 2025-07-30

### Changes
- CRITICAL FIX: Use renderApplication hook for D&D 5e item sheets

## [1.0.21] - 2025-07-30

### Changes
- Add comprehensive hook diagnostics for item sheet issue

## [1.0.20] - 2025-07-30

### Changes
- Add item sheet hook diagnostic test

## [1.0.19] - 2025-07-30

### Changes
- Fix character detection in diagnostic functions

## [1.0.18] - 2025-07-30

### Changes
- Add quick fix test function for immediate verification%0A- Fix critical UI issue: restore missing character sheet hooks

## [1.0.17] - 2025-07-29

### Changes
- Redesign Ring of Spell Storing to be item-centric instead of character sheet-centric%0A- Enhance diagnostics for GM use and focus on Priority 1 requirements

## [1.0.16] - 2025-07-26

### Changes
- Improve character sheet integration with enhanced diagnostics and sheet type detection

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
