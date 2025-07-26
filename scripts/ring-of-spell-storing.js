/**
 * Ring of Spell Storing Module for Foundry VTT D&D 5e
 * Implements the Ring of Spell Storing magic item with full spell storage mechanics
 */

import { RingInterface } from './ring-interface.js';

// Module constants
const MODULE_ID = 'ring-of-spell-storing';
const RING_ITEM_NAME = 'Ring of Spell Storing';
const MAX_SPELL_LEVELS = 5;

/**
 * Main module class
 */
class RingOfSpellStoring {
  static ID = MODULE_ID;

  static initialize() {
    console.log(`${MODULE_ID} | Initializing Ring of Spell Storing module`);

    // Register module settings
    this.registerSettings();

    // Register hooks
    this.registerHooks();

    // Register socket events for multiplayer support
    this.registerSocketEvents();

    // Initialize API
    this.initializeAPI();
  }

  /**
   * Register module settings
   */
  static registerSettings() {
    game.settings.register(MODULE_ID, 'showInterface', {
      name: game.i18n.localize('RING_OF_SPELL_STORING.Settings.ShowInterface.Name'),
      hint: game.i18n.localize('RING_OF_SPELL_STORING.Settings.ShowInterface.Hint'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(MODULE_ID, 'allowSelfSpells', {
      name: game.i18n.localize('RING_OF_SPELL_STORING.Settings.AllowSelfSpells.Name'),
      hint: game.i18n.localize('RING_OF_SPELL_STORING.Settings.AllowSelfSpells.Hint'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });
  }

  /**
   * Register Foundry hooks
   */
  static registerHooks() {
    // Hook into ready event
    Hooks.on('ready', this.onReady.bind(this));

    // Hook into actor sheet rendering - support multiple sheet types
    Hooks.on('renderActorSheet5eCharacter', this.onRenderActorSheet.bind(this));
    Hooks.on('renderActorSheet5eCharacter2', this.onRenderActorSheet.bind(this));
    Hooks.on('renderActorSheet', this.onRenderActorSheet.bind(this));

    // Hook into item usage
    Hooks.on('dnd5e.useItem', this.onUseItem.bind(this));

    // Hook into spell casting
    Hooks.on('dnd5e.rollSpell', this.onRollSpell.bind(this));

    // Hook into item transfer
    Hooks.on('transferItem', this.onTransferItem.bind(this));
  }

  /**
   * Register socket events for multiplayer functionality
   */
  static registerSocketEvents() {
    game.socket.on(`module.${MODULE_ID}`, this.handleSocketEvent.bind(this));
  }

  /**
   * Initialize module API
   */
  static initializeAPI() {
    game.modules.get(MODULE_ID).api = {
      findRingOnActor: this.findRingOnActor.bind(this),
      storeSpellInRing: this.storeSpellInRing.bind(this),
      castSpellFromRing: this.castSpellFromRing.bind(this),
      removeSpellFromRing: this.removeSpellFromRing.bind(this),
      transferRing: this.transferRing.bind(this),
      openRingInterface: this.openRingInterface.bind(this),
      addRingInterfaceButton: this.addRingInterfaceButton.bind(this),
      forceAddButtonToActor: this.forceAddButtonToActor.bind(this),
      debugActorRings: this.debugActorRings.bind(this)
    };
  }

  /**
   * Handle ready event
   */
  static onReady() {
    console.log(`${MODULE_ID} | Module ready`);

    // Create custom item type if it doesn't exist
    this.ensureRingItemExists();
  }

  /**
   * Handle actor sheet rendering
   */
  static onRenderActorSheet(sheet, html, _data) {
    console.log(`${MODULE_ID} | onRenderActorSheet called for ${sheet.actor.name}`);

    // Check if this is a character sheet
    if (sheet.actor.type !== 'character') {
      console.log(`${MODULE_ID} | Skipping non-character actor: ${sheet.actor.type}`);
      return;
    }

    // Check module setting
    const showInterface = game.settings.get(MODULE_ID, 'showInterface');
    console.log(`${MODULE_ID} | Show interface setting: ${showInterface}`);
    if (!showInterface) {
      return;
    }

    const actor = sheet.actor;
    const ring = this.findRingOnActor(actor);

    console.log(`${MODULE_ID} | Ring found on ${actor.name}: ${!!ring}`);
    if (ring) {
      console.log(`${MODULE_ID} | Ring details: ${ring.name}, equipped: ${ring.system.equipped}`);
      this.addRingInterfaceButton(html, actor, ring);
    } else {
      // Debug: List all equipment items
      const equipment = actor.items.filter(item => item.type === 'equipment');
      console.log(`${MODULE_ID} | Equipment items on ${actor.name}:`,
        equipment.map(item => `${item.name} (equipped: ${item.system.equipped})`));
    }
  }

  /**
   * Handle item usage
   */
  static onUseItem(item, _config, _options) {
    if (item.name === RING_ITEM_NAME) {
      // Open ring interface when the ring is used
      this.openRingInterface(item.actor, item);
      return false; // Prevent default usage
    }
  }

  /**
   * Handle spell casting
   */
  static onRollSpell(item, config, options) {
    // Check if this spell is being cast from a ring
    const ringSpellData = options.ringSpellData;
    if (ringSpellData) {
      // Use original caster's statistics
      config.spellAttackBonus = ringSpellData.originalCaster.spellAttackBonus;
      config.spellSaveDC = ringSpellData.originalCaster.spellSaveDC;
    }
  }

  /**
   * Handle item transfer
   */
  static onTransferItem(item, fromActor, toActor) {
    if (item.name === RING_ITEM_NAME) {
      ui.notifications.info(
        game.i18n.format('RING_OF_SPELL_STORING.Notifications.RingTransferred', {
          actor: toActor.name
        })
      );
    }
  }

  /**
   * Handle socket events
   */
  static handleSocketEvent(data) {
    switch (data.type) {
    case 'storeSpell':
      this.handleStoreSpellSocket(data);
      break;
    case 'castSpell':
      this.handleCastSpellSocket(data);
      break;
    case 'removeSpell':
      this.handleRemoveSpellSocket(data);
      break;
    }
  }

  /**
   * Find Ring of Spell Storing on an actor
   */
  static findRingOnActor(actor) {
    // First try exact name match
    let ring = actor.items.find(item =>
      item.name === RING_ITEM_NAME &&
      item.type === 'equipment' &&
      item.system.equipped
    );

    // If not found, try case-insensitive partial match
    if (!ring) {
      ring = actor.items.find(item =>
        item.name.toLowerCase().includes('ring of spell storing') &&
        item.type === 'equipment' &&
        item.system.equipped
      );
    }

    // If still not found, try any ring with spell storing in the name
    if (!ring) {
      ring = actor.items.find(item =>
        item.name.toLowerCase().includes('spell storing') &&
        item.type === 'equipment' &&
        item.system.equipped
      );
    }

    return ring;
  }

  /**
   * Ensure Ring of Spell Storing item exists in compendium or create it
   */
  static async ensureRingItemExists() {
    // This would typically create a compendium entry or template
    // For now, we'll rely on users creating the item manually
    console.log(`${MODULE_ID} | Ring item template ready`);
  }

  /**
   * Add ring interface button to character sheet
   */
  static addRingInterfaceButton(html, actor, ring) {
    console.log(`${MODULE_ID} | Adding ring interface button for ${actor.name}`);

    // Remove any existing buttons first
    html.find('.ring-interface-btn').remove();

    // Try multiple selectors for the inventory tab
    let inventoryTab = html.find('.tab[data-tab="inventory"]');

    if (inventoryTab.length === 0) {
      // Try alternative selectors
      inventoryTab = html.find('.inventory');
      console.log(`${MODULE_ID} | Trying .inventory selector: ${inventoryTab.length} found`);
    }

    if (inventoryTab.length === 0) {
      inventoryTab = html.find('[data-tab="inventory"]');
      console.log(`${MODULE_ID} | Trying [data-tab="inventory"] selector: ${inventoryTab.length} found`);
    }

    if (inventoryTab.length === 0) {
      // Try to find any tab and log available tabs for debugging
      const allTabs = html.find('.tab');
      console.log(`${MODULE_ID} | Available tabs:`, allTabs.map((i, tab) => $(tab).data('tab')).get());

      // Try to add to the first available tab or main content area
      const mainContent = html.find('.sheet-body, .window-content, .tab').first();
      if (mainContent.length > 0) {
        console.log(`${MODULE_ID} | Adding button to main content area`);
        inventoryTab = mainContent;
      } else {
        console.warn(`${MODULE_ID} | Could not find suitable location for ring button`);
        return;
      }
    }

    const buttonText = game.i18n.localize('RING_OF_SPELL_STORING.Interface.Title');
    const button = $(`
      <button type="button" class="ring-interface-btn" style="margin: 5px; background: #2196f3; color: white; border: none; border-radius: 4px; padding: 8px 16px; font-size: 13px; cursor: pointer;">
        <i class="fas fa-ring"></i> ${buttonText}
      </button>
    `);

    button.on('click', (event) => {
      event.preventDefault();
      console.log(`${MODULE_ID} | Ring interface button clicked`);
      this.openRingInterface(actor, ring);
    });

    // Add the button to the top of the inventory tab
    inventoryTab.prepend(button);
    console.log(`${MODULE_ID} | Ring interface button added successfully`);
  }

  /**
   * Open the ring interface
   */
  static openRingInterface(actor, ring) {
    new RingInterface(actor, ring).render(true);
  }

  /**
   * Store a spell in the ring
   */
  static async storeSpellInRing(actor, ring, spell, level, originalCaster) {
    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };

    // Check capacity
    const usedLevels = ringData.storedSpells.reduce((sum, s) => sum + s.level, 0);
    if (usedLevels + level > MAX_SPELL_LEVELS) {
      ui.notifications.warn(
        game.i18n.format('RING_OF_SPELL_STORING.Notifications.InsufficientCapacity', {
          required: level,
          available: MAX_SPELL_LEVELS - usedLevels
        })
      );
      return false;
    }

    // Add spell to ring
    const spellData = {
      id: spell.id,
      name: spell.name,
      level: level,
      originalCaster: {
        id: originalCaster.id,
        name: originalCaster.name,
        spellAttackBonus: originalCaster.system.attributes.spellcasting?.attack || 0,
        spellSaveDC: originalCaster.system.attributes.spellcasting?.dc || 8
      },
      storedAt: Date.now()
    };

    ringData.storedSpells.push(spellData);

    // Update ring item
    await ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellStored', {
        spell: spell.name
      })
    );

    return true;
  }

  /**
   * Cast a spell from the ring
   */
  static async castSpellFromRing(actor, ring, spellIndex) {
    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) {
      return false;
    }

    // Find the original spell item
    const spell = game.items.get(spellData.id) ||
                 actor.items.get(spellData.id) ||
                 await fromUuid(`Compendium.dnd5e.spells.${spellData.id}`);

    if (!spell) {
      ui.notifications.error(`Spell ${spellData.name} not found`);
      return false;
    }

    // Cast the spell with original caster's stats
    const options = {
      ringSpellData: spellData,
      consumeSpellSlot: false
    };

    await spell.roll(options);

    // Remove spell from ring
    ringData.storedSpells.splice(spellIndex, 1);
    await ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellCast', {
        spell: spellData.name
      })
    );

    return true;
  }

  /**
   * Remove a spell from the ring
   */
  static async removeSpellFromRing(actor, ring, spellIndex) {
    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) {
      return false;
    }

    ringData.storedSpells.splice(spellIndex, 1);
    await ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellRemoved', {
        spell: spellData.name
      })
    );

    return true;
  }

  /**
   * Transfer ring between actors
   */
  static async transferRing(_fromActor, _toActor, _ring) {
    // The ring retains its stored spells when transferred
    // This is handled by the default item transfer system
    return true;
  }

  /**
   * Debug function to check rings on an actor
   */
  static debugActorRings(actor) {
    console.log(`${MODULE_ID} | Debugging rings for ${actor.name}:`);

    const allItems = actor.items.contents;
    console.log(`${MODULE_ID} | Total items: ${allItems.length}`);

    const equipment = allItems.filter(item => item.type === 'equipment');
    console.log(`${MODULE_ID} | Equipment items: ${equipment.length}`);

    const rings = allItems.filter(item =>
      item.name.toLowerCase().includes('ring') ||
      item.name.toLowerCase().includes('spell storing')
    );

    console.log(`${MODULE_ID} | Ring-like items: ${rings.length}`);
    rings.forEach(ring => {
      console.log(`${MODULE_ID} |   - ${ring.name} (type: ${ring.type}, equipped: ${ring.system.equipped})`);
    });

    const foundRing = this.findRingOnActor(actor);
    console.log(`${MODULE_ID} | Ring found by findRingOnActor: ${!!foundRing}`);

    return foundRing;
  }

  /**
   * Force add button to a specific actor (for debugging)
   */
  static forceAddButtonToActor(actor) {
    console.log(`${MODULE_ID} | Force adding button to ${actor.name}`);

    const ring = this.findRingOnActor(actor);
    if (!ring) {
      console.log(`${MODULE_ID} | No ring found on ${actor.name}`);
      return false;
    }

    const sheet = actor.sheet;
    if (!sheet || !sheet.rendered) {
      console.log(`${MODULE_ID} | Actor sheet not rendered`);
      return false;
    }

    this.addRingInterfaceButton(sheet.element, actor, ring);
    return true;
  }
}

// Initialize module when Foundry is ready
Hooks.once('init', () => {
  RingOfSpellStoring.initialize();
});

// Export for API access
export { RingOfSpellStoring };
