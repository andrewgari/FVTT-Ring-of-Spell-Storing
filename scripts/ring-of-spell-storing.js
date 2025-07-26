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
      findRingsOnActor: this.findRingsOnActor.bind(this),
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

    const rings = this.findRingsOnActor(actor);
    if (rings.length === 0) {
      return;
    }

    console.log(`${MODULE_ID} | Preparing ring spells for ${actor.name} (${rings.length} rings)`);

    // Add ring spell data for each ring
    rings.forEach((ring, index) => {
      const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
      const storedSpells = ringData.storedSpells || [];

      if (storedSpells.length > 0) {
        const ringKey = `ring${index + 1}`;
        actor.system.spells[ringKey] = {
          value: storedSpells.length,
          max: MAX_SPELL_LEVELS,
          override: null,
          label: `${ring.name} (${storedSpells.reduce((sum, s) => sum + s.level, 0)}/${MAX_SPELL_LEVELS})`
        };
      }
    });
  }

  /**
   * Handle actor sheet rendering to add ring spell sections
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
    const rings = this.findRingsOnActor(actor);

    if (rings.length > 0) {
      this.addAllRingSpellsToSpellList(html, actor, rings);
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
      const ringId = item.flags[MODULE_ID].ringId;
      const ring = ringId ? actor.items.get(ringId) : this.findRingOnActor(actor);

      if (ring) {
        const ringSpellIndex = item.flags[MODULE_ID].ringSpellIndex;
        console.log(`${MODULE_ID} | Ring spell cast, removing from ring: ${item.name} (Ring: ${ring.name})`);

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
   * Find all Rings of Spell Storing on an actor
   */
  static findRingsOnActor(actor) {
    const rings = [];

    // Find all equipped rings that match our criteria
    actor.items.forEach(item => {
      if (item.type === 'equipment' && item.system.equipped) {
        // Check for exact name match
        if (item.name === RING_ITEM_NAME) {
          rings.push(item);
        } else if (item.name.toLowerCase().includes('ring of spell storing')) {
          // Check for case-insensitive partial match
          rings.push(item);
        } else if (item.name.toLowerCase().includes('spell storing')) {
          // Check for any ring with spell storing in the name
          rings.push(item);
        }
      }
    });

    return rings;
  }

  /**
   * Find Ring of Spell Storing on an actor (legacy method - returns first ring)
   */
  static findRingOnActor(actor) {
    const rings = this.findRingsOnActor(actor);
    return rings.length > 0 ? rings[0] : null;
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
   * Add all ring spells to the spell list on character sheet
   */
  static async addAllRingSpellsToSpellList(html, actor, rings) {
    console.log(`${MODULE_ID} | Adding ring spells to spell list for ${actor.name} (${rings.length} rings)`);

    // Find the spells tab
    const spellsTab = html.find('.tab[data-tab="spells"]');
    if (spellsTab.length === 0) {
      console.log(`${MODULE_ID} | Spells tab not found`);
      return;
    }

    // Remove any existing ring spell sections
    html.find('.ring-spells-section').remove();

    // Add a section for each ring
    for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
      const ring = rings[ringIndex];
      const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
      const storedSpells = ringData.storedSpells || [];

      if (storedSpells.length === 0) {
        continue; // Skip rings with no spells
      }

      await this.addSingleRingSpellsToSpellList(html, actor, ring, ringIndex, spellsTab);
    }
  }

  /**
   * Add spells from a single ring to the spell list
   */
  static async addSingleRingSpellsToSpellList(html, actor, ring, ringIndex, spellsTab) {
    const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const storedSpells = ringData.storedSpells || [];

    // Create unique ring identifier
    const ringId = ring.id;
    const usedLevels = storedSpells.reduce((sum, s) => sum + s.level, 0);

    // Create ring spells section
    const ringSpellsSection = $(`
      <div class="ring-spells-section" data-ring-id="${ringId}" style="margin-top: 10px; border-top: 2px solid #8b4513; padding-top: 10px;">
        <div class="ring-spells-header" style="display: flex; align-items: center; margin-bottom: 8px;">
          <h3 style="margin: 0; color: #8b4513; font-size: 14px;">
            <i class="fas fa-ring" style="margin-right: 5px;"></i>
            ${ring.name}
          </h3>
          <span style="margin-left: auto; font-size: 12px; color: #666;">
            ${usedLevels}/${MAX_SPELL_LEVELS} levels
          </span>
          <button class="manage-ring-btn" data-ring-id="${ringId}"
                  style="margin-left: 8px; background: #2196f3; color: white; border: none; border-radius: 3px; padding: 2px 6px; font-size: 10px; cursor: pointer;">
            <i class="fas fa-cog"></i> Manage
          </button>
        </div>
        <div class="ring-spells-list" data-ring-id="${ringId}"></div>
      </div>
    `);

    // Add individual ring spells
    const ringSpellsList = ringSpellsSection.find('.ring-spells-list');

    for (let i = 0; i < storedSpells.length; i++) {
      const spellData = storedSpells[i];
      // Include ring ID and index for proper identification
      spellData.ringId = ringId;
      spellData.ringIndex = ringIndex;
      spellData.spellIndex = i;

      const spellItem = await this.createRingSpellItem(actor, spellData, i, ringId);

      if (spellItem) {
        const spellElement = await this.createRingSpellElement(spellItem, spellData, ringId);
        ringSpellsList.append(spellElement);
      }
    }

    // Add manage button click handler
    ringSpellsSection.find('.manage-ring-btn').on('click', (event) => {
      event.preventDefault();
      const ringId = event.currentTarget.dataset.ringId;
      const ring = actor.items.get(ringId);
      if (ring) {
        this.openRingInterface(actor, ring);
      }
    });

    // Add the section to the spells tab
    spellsTab.append(ringSpellsSection);

    console.log(`${MODULE_ID} | Added ${storedSpells.length} spells from ${ring.name}`);
  }

  /**
   * Create a temporary spell item for ring spells
   */
  static async createRingSpellItem(actor, spellData, index, ringId = null) {
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
        ringId: ringId || spellData.ringId,
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
  static async createRingSpellElement(spellItem, spellData, ringId = null) {
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
          <button class="cast-ring-spell"
                  data-spell-index="${spellData.spellIndex || 0}"
                  data-ring-id="${ringId || spellData.ringId}"
                  style="background: #4caf50; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 11px; cursor: pointer;">
            <i class="fas fa-magic"></i> Cast
          </button>
          <button class="remove-ring-spell"
                  data-spell-index="${spellData.spellIndex || 0}"
                  data-ring-id="${ringId || spellData.ringId}"
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
      const ringId = event.currentTarget.dataset.ringId;
      await this.castRingSpellFromList(spellItem.parent, spellIndex, ringId);
    });

    spellElement.find('.remove-ring-spell').on('click', async(event) => {
      event.preventDefault();
      const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
      const ringId = event.currentTarget.dataset.ringId;

      const confirmed = await Dialog.confirm({
        title: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.RemoveSpell.Title'),
        content: game.i18n.format('RING_OF_SPELL_STORING.Dialogs.RemoveSpell.Confirm', {
          spell: spellData.name
        })
      });

      if (confirmed) {
        const ring = spellItem.parent.items.get(ringId);
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
  static async castRingSpellFromList(actor, spellIndex, ringId = null) {
    console.log(`${MODULE_ID} | Casting ring spell from list: index ${spellIndex}, ring ${ringId}`);

    let ring;
    if (ringId) {
      ring = actor.items.get(ringId);
    } else {
      ring = this.findRingOnActor(actor);
    }

    if (!ring) {
      ui.notifications.error('Ring of Spell Storing not found');
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
