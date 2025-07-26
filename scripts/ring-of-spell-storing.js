/**
 * Ring of Spell Storing Module for Foundry VTT D&D 5e
 * Implements the Ring of Spell Storing magic item with full spell storage mechanics
 */

import { RingInterface } from './ring-interface.js';
import { RingItem } from './ring-item.js';

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
    
    // Hook into actor sheet rendering
    Hooks.on('renderActorSheet5eCharacter', this.onRenderActorSheet.bind(this));
    
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
      openRingInterface: this.openRingInterface.bind(this)
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
  static onRenderActorSheet(sheet, html, data) {
    if (!game.settings.get(MODULE_ID, 'showInterface')) return;
    
    const actor = sheet.actor;
    const ring = this.findRingOnActor(actor);
    
    if (ring) {
      this.addRingInterfaceButton(html, actor, ring);
    }
  }

  /**
   * Handle item usage
   */
  static onUseItem(item, config, options) {
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
    return actor.items.find(item => 
      item.name === RING_ITEM_NAME && 
      item.type === 'equipment' &&
      item.system.equipped
    );
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
    const inventoryTab = html.find('.tab[data-tab="inventory"]');
    if (inventoryTab.length === 0) return;

    const button = $(`
      <button type="button" class="ring-interface-btn" style="margin: 5px;">
        <i class="fas fa-ring"></i> ${game.i18n.localize('RING_OF_SPELL_STORING.Interface.Title')}
      </button>
    `);

    button.on('click', () => {
      this.openRingInterface(actor, ring);
    });

    inventoryTab.prepend(button);
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
    
    if (!spellData) return false;

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
    
    if (!spellData) return false;

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
  static async transferRing(fromActor, toActor, ring) {
    // The ring retains its stored spells when transferred
    // This is handled by the default item transfer system
    return true;
  }
}

// Initialize module when Foundry is ready
Hooks.once('init', () => {
  RingOfSpellStoring.initialize();
});

// Export for API access
export { RingOfSpellStoring };
