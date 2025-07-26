# Ring of Spell Storing - Foundry VTT Module

A comprehensive implementation of the Ring of Spell Storing magic item for D&D 5th Edition in Foundry VTT, featuring complete spell storage mechanics, original caster statistics tracking, and an intuitive user interface.

## Features

### Core Functionality
- **Spell Storage System**: Store up to 5 levels worth of spells in the ring
- **Original Caster Stats**: Tracks and uses the original caster's spell attack bonus and save DC
- **Intuitive UI**: Clean, user-friendly interface for managing stored spells
- **Capacity Management**: Visual capacity bar showing used/remaining spell levels

### Storage Mechanics
- Any spellcaster can store spells by expending their spell slots
- Supports storing any spell from levels 1-5
- Optional support for self-targeting spells (configurable)
- Persistent storage across game sessions
- Maintains spell data when ring is transferred between characters

### Casting Interface
- Cast stored spells using original caster's statistics
- Clear visual indication of ring spells vs. character spells
- Confirmation dialogs for spell casting and removal
- Automatic spell removal after casting

### Transfer & Ownership
- Seamless ring transfer between players
- Preserved spell data and original caster stats during transfers
- Non-owners can store spells if they have access to the ring
- Proper permission handling for different user roles

## Installation

### Method 1: Direct Installation (Recommended)
1. In Foundry VTT, go to the **Add-on Modules** tab
2. Click **Install Module**
3. Paste this manifest URL: `https://raw.githubusercontent.com/andrewgari/FVTT-Ring-of-Spell-Storing/main/module.json`
4. Click **Install**
5. Enable the module in your world

## Development

### Setting Up Development Environment
1. Clone the repository
2. Run the setup script:
   ```bash
   ./setup-dev.sh
   ```
   This will:
   - Install ESLint and dependencies
   - Set up git hooks for automatic linting
   - Run an initial lint check

### Available Commands
- `npm run lint` - Check for linting issues
- `npm run lint:fix` - Auto-fix linting issues

### Git Hooks
The repository includes a pre-commit hook that automatically runs ESLint on JavaScript files before each commit. This ensures code quality and consistency.

To bypass the hook (not recommended):
```bash
git commit --no-verify
```

### Method 2: Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/andrewgari/FVTT-Ring-of-Spell-Storing/releases)
2. Extract the zip file to your `Data/modules/` directory
3. Restart Foundry VTT
4. Enable the module in your world

### Updates
The module will automatically check for updates when using the direct installation method. You'll be notified in Foundry VTT when new versions are available.

## Usage

### Setting Up the Ring

1. Create a new Equipment item named "Ring of Spell Storing"
2. Set it as a ring/accessory and mark it as magical
3. Equip it on a character
4. The ring interface button will appear on the character sheet

### Storing Spells

1. Open the ring interface from the character sheet
2. Click "Store Spell"
3. Select a spell and the slot level to use
4. The spell is stored with your character's current spellcasting statistics

### Casting Spells

1. Open the ring interface
2. Click "Cast Spell" next to any stored spell
3. The spell will be cast using the original caster's stats
4. The spell is automatically removed from the ring after casting

### Managing Spells

- **Remove Spell**: Manually remove a spell without casting it
- **View Details**: See original caster info and spell statistics
- **Capacity Tracking**: Monitor remaining storage space

## Configuration

### Module Settings

- **Show Ring Interface**: Toggle the ring interface button on character sheets
- **Allow Self-Targeting Spells**: Allow storing spells that target "Self" (like Shield, Mage Armor)

### Permissions

- **Ring Owner**: Can cast spells from the ring and manage stored spells
- **Other Players**: Can store spells in the ring if they have access to it
- **GM**: Full access to all ring functions

## Technical Details

### Compatibility
- **Foundry VTT**: Version 12+
- **D&D 5e System**: Version 3.0.0+
- **Tested**: Foundry VTT v12.x with D&D 5e system

### Data Storage
- Spell data is stored in the ring item's flags
- Includes original caster ID, name, spell attack bonus, and save DC
- Persistent across game sessions and ring transfers

### API Access

The module provides an API for other modules to interact with:

```javascript
// Access the API
const ringAPI = game.modules.get('ring-of-spell-storing').api;

// Find ring on actor
const ring = ringAPI.findRingOnActor(actor);

// Store a spell
await ringAPI.storeSpellInRing(actor, ring, spell, level, originalCaster);

// Cast a spell
await ringAPI.castSpellFromRing(actor, ring, spellIndex);

// Open ring interface
ringAPI.openRingInterface(actor, ring);
```

## Troubleshooting

### Common Issues

**Ring interface doesn't appear**
- Ensure the item is named exactly "Ring of Spell Storing"
- Check that the ring is equipped
- Verify the "Show Ring Interface" setting is enabled

**Spells not casting with correct stats**
- Verify the original caster had proper spellcasting statistics when storing
- Check that the spell was stored correctly (view in ring interface)

**Capacity issues**
- Remember the ring holds 5 spell levels total, not 5 spells
- A single 5th level spell uses all capacity
- Check remaining capacity before storing new spells

### Support

For bug reports and feature requests, please visit:
[GitHub Issues](https://github.com/andrewgari/FVTT-Ring-of-Spell-Storing/issues)

## License

This module is licensed under the MIT License. See LICENSE file for details.

## Credits

- **Author**: Andrew Gari
- **System**: D&D 5th Edition by Foundry VTT
- **Platform**: Foundry Virtual Tabletop

## Changelog

### Version 1.0.0
- Initial release
- Complete ring functionality implementation
- UI interface for spell management
- Original caster statistics tracking
- Ring transfer support
- Configurable settings
