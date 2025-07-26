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
- MIT License
