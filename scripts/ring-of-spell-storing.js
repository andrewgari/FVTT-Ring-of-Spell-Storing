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

    // Hook into actor sheet rendering to add ring spells to spell list
    Hooks.on('renderActorSheet5eCharacter', this.onRenderActorSheet.bind(this));
    Hooks.on('renderActorSheet5eCharacter2', this.onRenderActorSheet.bind(this));
    Hooks.on('renderActorSheet', this.onRenderActorSheet.bind(this));

    // Hook into actor data preparation to inject ring spells
    Hooks.on('dnd5e.prepareActorData', this.onPrepareActorData.bind(this));

    // Hook into item usage
    Hooks.on('dnd5e.useItem', this.onUseItem.bind(this));

    // Hook into spell casting to handle ring spells
    Hooks.on('dnd5e.preRollSpell', this.onPreRollSpell.bind(this));
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
      castRingSpellFromList: this.castRingSpellFromList.bind(this),
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
   * Handle actor data preparation to inject ring spells
   */
  static onPrepareActorData(actor) {
    if (actor.type !== 'character') {
      return;
    }

    const ring = this.findRingOnActor(actor);
    if (!ring) {
      return;
    }

    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const storedSpells = ringData.storedSpells || [];

    if (storedSpells.length === 0) {
      return;
    }

    console.log(`${MODULE_ID} | Preparing ${storedSpells.length} ring spells for ${actor.name}`);

    // Add ring spells to actor's spell data for display
    if (!actor.system.spells.ring) {
      actor.system.spells.ring = {
        value: storedSpells.length,
        max: MAX_SPELL_LEVELS,
        override: null,
        label: game.i18n.localize('RING_OF_SPELL_STORING.SpellList.SectionTitle')
      };
    }
  }

  /**
   * Handle actor sheet rendering to add ring spell section
   */
  static onRenderActorSheet(sheet, html, _data) {
    console.log(`${MODULE_ID} | onRenderActorSheet called for ${sheet.actor.name}`);

    // Check if this is a character sheet
    if (sheet.actor.type !== 'character') {
      return;
    }

    // Check module setting
    const showInterface = game.settings.get(MODULE_ID, 'showInterface');
    if (!showInterface) {
      return;
    }

    const actor = sheet.actor;
    const ring = this.findRingOnActor(actor);

    if (ring) {
      this.addRingSpellsToSpellList(html, actor, ring);
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
   * Handle pre-spell casting to set up ring spell data
   */
  static onPreRollSpell(item, config, options) {
    // Check if this is a ring spell
    if (item.flags?.[MODULE_ID]?.isRingSpell) {
      const ringSpellData = item.flags[MODULE_ID].ringSpellData;
      console.log(`${MODULE_ID} | Pre-rolling ring spell: ${item.name}`);

      // Set original caster's statistics
      config.spellAttackBonus = ringSpellData.originalCaster.spellAttackBonus;
      config.spellSaveDC = ringSpellData.originalCaster.spellSaveDC;

      // Mark that this spell should not consume spell slots
      options.consumeSpellSlot = false;

      console.log(`${MODULE_ID} | Using original caster stats - Attack: +${config.spellAttackBonus}, DC: ${config.spellSaveDC}`);
    }
  }

  /**
   * Handle spell casting completion
   */
  static async onRollSpell(item, _config, _options) {
    // Check if this is a ring spell that was just cast
    if (item.flags?.[MODULE_ID]?.isRingSpell) {
      const actor = item.parent;
      const ring = this.findRingOnActor(actor);

      if (ring) {
        const ringSpellIndex = item.flags[MODULE_ID].ringSpellIndex;
        console.log(`${MODULE_ID} | Ring spell cast, removing from ring: ${item.name}`);

        // Remove the spell from the ring
        await this.removeSpellFromRing(actor, ring, ringSpellIndex);

        // Re-render the actor sheet to update the spell list
        if (actor.sheet.rendered) {
          actor.sheet.render(false);
        }
      }
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
   * Add ring spells to the spell list on character sheet
   */
  static async addRingSpellsToSpellList(html, actor, ring) {
    console.log(`${MODULE_ID} | Adding ring spells to spell list for ${actor.name}`);

    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const storedSpells = ringData.storedSpells || [];

    if (storedSpells.length === 0) {
      console.log(`${MODULE_ID} | No ring spells to display`);
      return;
    }

    // Find the spells tab
    const spellsTab = html.find('.tab[data-tab="spells"]');
    if (spellsTab.length === 0) {
      console.log(`${MODULE_ID} | Spells tab not found`);
      return;
    }

    // Remove any existing ring spell sections
    html.find('.ring-spells-section').remove();

    // Create ring spells section
    const ringSpellsSection = $(`
      <div class="ring-spells-section" style="margin-top: 10px; border-top: 2px solid #8b4513; padding-top: 10px;">
        <div class="ring-spells-header" style="display: flex; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; color: #8b4513; font-size: 14px;">
            <i class="fas fa-ring" style="margin-right: 5px;"></i>
            ${game.i18n.localize('RING_OF_SPELL_STORING.SpellList.SectionTitle')}
          </h3>
          <span style="margin-left: auto; font-size: 12px; color: #666;">
            ${storedSpells.reduce((sum, s) => sum + s.level, 0)}/${MAX_SPELL_LEVELS} levels
          </span>
        </div>
        <div class="ring-spells-list"></div>
      </div>
    `);

    // Add individual ring spells
    const ringSpellsList = ringSpellsSection.find('.ring-spells-list');

    for (let i = 0; i < storedSpells.length; i++) {
      const spellData = storedSpells[i];
      const spellItem = await this.createRingSpellItem(actor, spellData, i);

      if (spellItem) {
        const spellElement = await this.createRingSpellElement(spellItem, spellData);
        ringSpellsList.append(spellElement);
      }
    }

    // Add the section to the spells tab
    spellsTab.append(ringSpellsSection);

    console.log(`${MODULE_ID} | Added ${storedSpells.length} ring spells to spell list`);
  }

  /**
   * Create a temporary spell item for ring spells
   */
  static async createRingSpellItem(actor, spellData, index) {
    try {
      // Try to find the original spell
      let originalSpell = game.items.get(spellData.id);

      if (!originalSpell) {
        // Try to find in compendium
        const pack = game.packs.get('dnd5e.spells');
        if (pack) {
          originalSpell = await pack.getDocument(spellData.id);
        }
      }

      if (!originalSpell) {
        console.warn(`${MODULE_ID} | Original spell not found: ${spellData.name}`);
        return null;
      }

      // Create a temporary spell item with ring-specific data
      const spellItemData = foundry.utils.duplicate(originalSpell.toObject());

      // Mark as ring spell and add ring-specific data
      spellItemData.flags = spellItemData.flags || {};
      spellItemData.flags[MODULE_ID] = {
        isRingSpell: true,
        ringSpellIndex: index,
        ringSpellData: spellData
      };

      // Set the spell level to the stored level (may be higher than base)
      spellItemData.system.level = spellData.level;

      // Mark as always prepared
      spellItemData.system.preparation = {
        mode: 'always',
        prepared: true
      };

      // Create the temporary item
      const tempSpell = new CONFIG.Item.documentClass(spellItemData, { parent: actor });

      return tempSpell;
    } catch (error) {
      console.error(`${MODULE_ID} | Error creating ring spell item:`, error);
      return null;
    }
  }

  /**
   * Create HTML element for a ring spell
   */
  static async createRingSpellElement(spellItem, spellData) {
    const spellElement = $(`
      <div class="ring-spell-item" style="display: flex; align-items: center; padding: 4px 8px; margin: 2px 0; background: #f9f9f9; border-radius: 3px; border-left: 3px solid #8b4513;">
        <div class="spell-level-indicator" style="width: 24px; height: 24px; background: #8b4513; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 8px;">
          ${spellData.level}
        </div>
        <div class="spell-info" style="flex: 1;">
          <div class="spell-name" style="font-weight: bold; color: #8b4513;">
            ${spellItem.name}
          </div>
          <div class="spell-caster-info" style="font-size: 11px; color: #666;">
            Cast by ${spellData.originalCaster.name}
            (Attack: +${spellData.originalCaster.spellAttackBonus}, DC: ${spellData.originalCaster.spellSaveDC})
          </div>
        </div>
        <div class="spell-actions" style="display: flex; gap: 4px;">
          <button class="cast-ring-spell" data-spell-index="${spellData.ringSpellIndex || 0}"
                  style="background: #4caf50; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 11px; cursor: pointer;">
            <i class="fas fa-magic"></i> Cast
          </button>
          <button class="remove-ring-spell" data-spell-index="${spellData.ringSpellIndex || 0}"
                  style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 11px; cursor: pointer;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `);

    // Add click handlers
    spellElement.find('.cast-ring-spell').on('click', async(event) => {
      event.preventDefault();
      const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
      await this.castRingSpellFromList(spellItem.parent, spellIndex);
    });

    spellElement.find('.remove-ring-spell').on('click', async(event) => {
      event.preventDefault();
      const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
      const confirmed = await Dialog.confirm({
        title: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.RemoveSpell.Title'),
        content: game.i18n.format('RING_OF_SPELL_STORING.Dialogs.RemoveSpell.Confirm', {
          spell: spellData.name
        })
      });

      if (confirmed) {
        const ring = this.findRingOnActor(spellItem.parent);
        if (ring) {
          await this.removeSpellFromRing(spellItem.parent, ring, spellIndex);
          // Re-render the sheet to update the spell list
          if (spellItem.parent.sheet.rendered) {
            spellItem.parent.sheet.render(false);
          }
        }
      }
    });

    return spellElement;
  }

  /**
   * Open the ring interface (kept for backward compatibility)
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
   * Cast a ring spell from the spell list
   */
  static async castRingSpellFromList(actor, spellIndex) {
    console.log(`${MODULE_ID} | Casting ring spell from list: index ${spellIndex}`);

    const ring = this.findRingOnActor(actor);
    if (!ring) {
      ui.notifications.error('No Ring of Spell Storing found');
      return false;
    }

    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) {
      ui.notifications.error('Spell not found in ring');
      return false;
    }

    try {
      // Create the ring spell item
      const ringSpellItem = await this.createRingSpellItem(actor, spellData, spellIndex);
      if (!ringSpellItem) {
        ui.notifications.error(`Could not create spell item for ${spellData.name}`);
        return false;
      }

      // Cast the spell - the preRollSpell hook will handle the original caster stats
      await ringSpellItem.roll({
        spellLevel: spellData.level,
        consumeSpellSlot: false,
        configureDialog: true
      });

      console.log(`${MODULE_ID} | Ring spell ${spellData.name} cast successfully`);
      return true;

    } catch (error) {
      console.error(`${MODULE_ID} | Error casting ring spell:`, error);
      ui.notifications.error(`Failed to cast ${spellData.name}: ${error.message}`);
      return false;
    }
  }

  /**
   * Cast a spell from the ring (legacy method)
   */
  static async castSpellFromRing(actor, ring, spellIndex) {
    return this.castRingSpellFromList(actor, spellIndex);
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
