/**
 * Ring of Spell Storing Module for Foundry VTT D&D 5e
 * Implements the Ring of Spell Storing magic item with full spell storage mechanics
 */

import { RingInterface } from './ring-interface.js';
import { RingDiagnostics } from './ring-diagnostics.js';

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
    console.log(`${MODULE_ID} | Registering hooks`);

    // Hook into ready event
    Hooks.on('ready', this.onReady.bind(this));

    // Hook into item sheet rendering - use multiple hooks for better compatibility
    Hooks.on('renderItemSheet', this.onRenderItemSheet.bind(this));
    Hooks.on('renderItemSheet5e', this.onRenderItemSheet.bind(this));
    Hooks.on('renderApplication', (app, html, data) => {
      // Only handle if it's an item sheet
      if (app.document && app.document.documentName === 'Item') {
        this.onRenderItemSheet(app, html, data);
      }
    });

    console.log(`${MODULE_ID} | Registered item sheet hooks`);

    // Hook into actor sheet rendering to add ring spells to spell list
    // Register for multiple possible sheet types to ensure compatibility
    const sheetHooks = [
      'renderActorSheet',
      'renderActorSheet5eCharacter',
      'renderActorSheet5eCharacter2',
      'renderActorSheet5e',
      'renderDnd5eActorSheet'
    ];

    sheetHooks.forEach(hookName => {
      Hooks.on(hookName, this.onRenderActorSheet.bind(this));
      console.log(`${MODULE_ID} | Registered hook: ${hookName}`);
    });

    // Hook into actor data preparation to inject ring spells
    Hooks.on('dnd5e.prepareActorData', this.onPrepareActorData.bind(this));

    // Hook into context menu for inventory items
    Hooks.on('getItemDirectoryEntryContext', this.onGetItemContext.bind(this));
    Hooks.on('getActorSheetHeaderButtons', this.onGetActorSheetHeaderButtons.bind(this));

    // Hook into actor sheet context menus for inventory items
    Hooks.on('dnd5e.getItemContextOptions', this.onGetItemContextOptions.bind(this));

    // Also try the generic context menu hook
    Hooks.on('getItemDirectoryEntryContext', this.onGetItemDirectoryContext.bind(this));

    // Hook into actor sheet header buttons for toolbar access
    Hooks.on('getActorSheetHeaderButtons', this.onGetActorSheetHeaderButtons.bind(this));

    console.log(`${MODULE_ID} | Registered context menu and toolbar hooks`);

    // Hook into item usage
    Hooks.on('dnd5e.useItem', this.onUseItem.bind(this));

    // Hook into spell casting to handle ring spells
    Hooks.on('dnd5e.preRollSpell', this.onPreRollSpell.bind(this));
    Hooks.on('dnd5e.rollSpell', this.onRollSpell.bind(this));

    // Hook into item transfer
    Hooks.on('transferItem', this.onTransferItem.bind(this));

    console.log(`${MODULE_ID} | All hooks registered successfully`);
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
    const api = {
      findRingOnActor: this.findRingOnActor.bind(this),
      findRingsOnActor: this.findRingsOnActor.bind(this),
      storeSpellInRing: this.storeSpellInRing.bind(this),
      castSpellFromRing: this.castSpellFromRing.bind(this),
      removeSpellFromRing: this.removeSpellFromRing.bind(this),
      transferRing: this.transferRing.bind(this),
      openRingInterface: this.openRingInterface.bind(this),
      // Data management methods
      getRingSpellData: this.getRingSpellData.bind(this),
      setRingSpellData: this.setRingSpellData.bind(this),
      // Diagnostic methods
      diagnoseRing: RingDiagnostics.diagnoseRing.bind(RingDiagnostics),
      testRingDetection: RingDiagnostics.testRingDetection.bind(RingDiagnostics),
      testUIInjection: RingDiagnostics.testUIInjection.bind(RingDiagnostics),
      checkModuleStatus: RingDiagnostics.checkModuleInitialization.bind(RingDiagnostics),
      // Helper methods for character selection
      getSelectedActor: this.getSelectedActor.bind(this),
      testWithSelectedToken: this.testWithSelectedToken.bind(this),
      // Main class reference for direct access
      RingOfSpellStoring: this
    };

    game.modules.get(MODULE_ID).api = api;

    // Also make it globally available for console debugging
    window.RingOfSpellStoringAPI = api;

    console.log(`${MODULE_ID} | API initialized with ${Object.keys(api).length} methods`);
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
    try {
      console.log(`${MODULE_ID} | onRenderActorSheet called for ${sheet.actor.name} (sheet type: ${sheet.constructor.name})`);

      // Check if this is a character sheet
      if (sheet.actor.type !== 'character') {
        console.log(`${MODULE_ID} | Skipping non-character actor: ${sheet.actor.type}`);
        return;
      }

      // Check module setting
      const showInterface = game.settings.get(MODULE_ID, 'showInterface');
      console.log(`${MODULE_ID} | Show interface setting: ${showInterface}`);
      if (!showInterface) {
        console.log(`${MODULE_ID} | Interface disabled in settings`);
        return;
      }

      const actor = sheet.actor;
      const rings = this.findRingsOnActor(actor);
      console.log(`${MODULE_ID} | Found ${rings.length} rings on ${actor.name}`);

      // Detect sheet type for better compatibility
      const sheetType = this.detectSheetType(sheet);
      console.log(`${MODULE_ID} | Detected sheet type: ${sheetType}`);

      if (rings.length > 0) {
        console.log(`${MODULE_ID} | Adding ring spells to spell list`);
        // Add a small delay to ensure the sheet is fully rendered
        setTimeout(() => {
          this.addAllRingSpellsToSpellList(html, actor, rings, sheetType).catch(error => {
            console.error(`${MODULE_ID} | Error adding ring spells:`, error);
          });
        }, 100);
      } else {
        console.log(`${MODULE_ID} | No rings found, checking all items for debugging`);
        this.debugActorItems(actor);
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Error in onRenderActorSheet:`, error);
    }
  }

  /**
   * Handle context menu options for items in character sheets
   */
  static onGetItemContextOptions(item, contextOptions) {
    try {
      console.log(`${MODULE_ID} | onGetItemContextOptions called for item: ${item?.name} (type: ${item?.type})`);

      // Only add context menu for Ring of Spell Storing
      if (!this.isRingOfSpellStoring(item)) {
        return contextOptions;
      }

      console.log(`${MODULE_ID} | Adding context menu options for Ring of Spell Storing: ${item.name}`);

      // Add ring management options to the context menu
      const ringOptions = [
        {
          name: '🔮 Manage Stored Spells',
          icon: '<i class="fas fa-magic"></i>',
          condition: () => true,
          callback: () => {
            console.log(`${MODULE_ID} | Context menu: Manage Stored Spells clicked`);
            this.openRingManagementDialog(item);
          }
        },
        {
          name: '📥 Store New Spell',
          icon: '<i class="fas fa-plus-circle"></i>',
          condition: () => true,
          callback: () => {
            console.log(`${MODULE_ID} | Context menu: Store New Spell clicked`);
            this.openStoreSpellDialog(item);
          }
        },
        {
          name: '📋 View Ring Contents',
          icon: '<i class="fas fa-list"></i>',
          condition: () => true,
          callback: () => {
            console.log(`${MODULE_ID} | Context menu: View Ring Contents clicked`);
            this.showRingContents(item);
          }
        }
      ];

      // Insert ring options at the beginning of the context menu
      contextOptions.unshift(...ringOptions);

      console.log(`${MODULE_ID} | Added ${ringOptions.length} context menu options`);
      return contextOptions;
    } catch (error) {
      console.error(`${MODULE_ID} | Error in onGetItemContextOptions:`, error);
      return contextOptions;
    }
  }

  /**
   * Handle item sheet rendering to add ring spell management interface
   * This handles both renderItemSheet and renderApplication hooks
   */
  static onRenderItemSheet(sheet, html, _data) {
    try {
      // Handle different hook signatures
      // renderApplication: sheet is the application, item is sheet.document or sheet.item
      // renderItemSheet: sheet is the item sheet, item is sheet.item
      const item = sheet.document || sheet.item || sheet.object;

      if (!item) {
        console.log(`${MODULE_ID} | onRenderItemSheet: No item found in sheet`);
        return; // Not an item sheet
      }

      console.log(`${MODULE_ID} | onRenderItemSheet called for "${item.name}" (type: ${item.type}, sheet: ${sheet.constructor.name})`);

      // Check if this is a Ring of Spell Storing
      const isRing = this.isRingOfSpellStoring(item);
      console.log(`${MODULE_ID} | Is Ring of Spell Storing: ${isRing}`);

      if (!isRing) {
        return;
      }

      console.log(`${MODULE_ID} | Detected Ring of Spell Storing: ${item.name}`);

      // Check module setting
      const showInterface = game.settings.get(MODULE_ID, 'showInterface');
      console.log(`${MODULE_ID} | Show interface setting: ${showInterface}`);
      if (!showInterface) {
        console.log(`${MODULE_ID} | Interface disabled in settings`);
        return;
      }

      // Add header button for quick access
      this.addRingHeaderButton(html, item);

      // Add a small delay to ensure the sheet is fully rendered
      setTimeout(() => {
        console.log(`${MODULE_ID} | Adding spell management interface to ${item.name}`);
        this.addSpellManagementToItemSheet(html, item).catch(error => {
          console.error(`${MODULE_ID} | Error adding spell management interface:`, error);
        });
      }, 100);

    } catch (error) {
      console.error(`${MODULE_ID} | Error in onRenderItemSheet:`, error);
    }
  }

  /**
   * Check if an item is a Ring of Spell Storing
   */
  static isRingOfSpellStoring(item) {
    if (!item || item.type !== 'equipment') {
      return false;
    }

    const itemName = item.name?.toLowerCase() || '';

    // Check by exact name match (case insensitive)
    if (itemName === 'ring of spell storing') {
      return true;
    }

    // Check by partial name match
    if (itemName.includes('ring of spell storing')) {
      return true;
    }

    // Check by flags (for items that have been modified)
    if (item.system?.flags?.[MODULE_ID]) {
      return true;
    }

    // Check by item flags (alternative location)
    if (item.flags?.[MODULE_ID]) {
      return true;
    }

    // Check by description or other identifiers
    const description = item.system?.description?.value?.toLowerCase() || '';
    if (description.includes('ring of spell storing')) {
      return true;
    }

    // Check for any ring with "spell storing" in the name
    if (itemName.includes('spell storing') && itemName.includes('ring')) {
      return true;
    }

    return false;
  }

  /**
   * Get stored spells data from a ring using Foundry's flag system
   */
  static getRingSpellData(ring) {
    try {
      // Try multiple locations for compatibility with ring-interface.js
      let flagData = null;

      // Method 1: System flags (primary method used by ring-interface.js)
      flagData = ring.system.flags?.[MODULE_ID]?.storedSpells;
      if (flagData && Array.isArray(flagData)) {
        console.log(`${MODULE_ID} | Found spell data via system.flags:`, flagData.length, 'spells');
        return flagData;
      }

      // Method 2: Direct flag access (fallback)
      flagData = ring.getFlag(MODULE_ID, 'storedSpells');
      if (flagData && Array.isArray(flagData)) {
        console.log(`${MODULE_ID} | Found spell data via getFlag:`, flagData.length, 'spells');
        return flagData;
      }

      // Method 3: Item flags (alternative location)
      flagData = ring.flags?.[MODULE_ID]?.storedSpells;
      if (flagData && Array.isArray(flagData)) {
        console.log(`${MODULE_ID} | Found spell data via flags:`, flagData.length, 'spells');
        return flagData;
      }

      console.log(`${MODULE_ID} | No spell data found for ${ring.name}, returning empty array`);
      return [];
    } catch (error) {
      console.error(`${MODULE_ID} | Error getting ring spell data:`, error);
      return [];
    }
  }

  /**
   * Set stored spells data on a ring using Foundry's flag system
   */
  static async setRingSpellData(ring, spellData) {
    try {
      console.log(`${MODULE_ID} | Setting ring spell data for ${ring.name}:`, spellData);

      // Ensure spellData is an array
      const spellArray = Array.isArray(spellData) ? spellData : [];

      // Create the ring data structure that matches ring-interface.js expectations
      const ringData = {
        storedSpells: spellArray
      };

      // Determine the correct update method based on ring ownership
      if (ring.parent) {
        // Ring is owned by actor, update through actor (embedded document)
        console.log(`${MODULE_ID} | Updating ring through actor (embedded document)...`);

        const embeddedUpdateData = {
          _id: ring.id,
          [`system.flags.${MODULE_ID}`]: ringData
        };

        await ring.parent.updateEmbeddedDocuments('Item', [embeddedUpdateData]);
      } else {
        // Ring is a world item, update directly
        console.log(`${MODULE_ID} | Updating ring directly (world item)...`);
        const updateData = {
          [`system.flags.${MODULE_ID}`]: ringData
        };
        await ring.update(updateData);
      }

      console.log(`${MODULE_ID} | Successfully updated spell data for ${ring.name}`);
      return true;
    } catch (error) {
      console.error(`${MODULE_ID} | Error setting ring spell data:`, error);
      return false;
    }
  }

  /**
   * Calculate used spell levels in a ring
   */
  static calculateUsedLevels(ring) {
    const storedSpells = this.getRingSpellData(ring);
    return storedSpells.reduce((total, spell) => total + (spell.level || 0), 0);
  }

  /**
   * Check if a ring has capacity for a new spell
   */
  static hasCapacity(ring, spellLevel) {
    const usedLevels = this.calculateUsedLevels(ring);
    return (usedLevels + spellLevel) <= MAX_SPELL_LEVELS;
  }

  /**
   * Add spell management interface to the Ring of Spell Storing item sheet
   */
  static async addSpellManagementToItemSheet(html, ring) {
    try {
      console.log(`${MODULE_ID} | Adding spell management interface to ${ring.name}`);

      // Ensure html is a jQuery object
      const $html = html instanceof jQuery ? html : $(html);
      if (!$html || $html.length === 0) {
        console.warn(`${MODULE_ID} | Invalid HTML object provided`);
        return;
      }

      // Get ring data - try multiple flag locations for compatibility
      const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
      const storedSpells = ringData.storedSpells || [];
      const usedLevels = storedSpells.reduce((sum, s) => sum + s.level, 0);
      const remainingLevels = MAX_SPELL_LEVELS - usedLevels;

      console.log(`${MODULE_ID} | Ring data:`, { storedSpells: storedSpells.length, usedLevels, remainingLevels });

      // Find a good place to inject the interface - try multiple selectors
      const targetSelectors = [
        '.tab[data-tab="details"] .tab-body',  // D&D 5e v3+ details tab body
        '.tab[data-tab="details"]',           // D&D 5e details tab
        '.tab[data-tab="description"] .tab-body', // Description tab body
        '.tab[data-tab="description"]',       // Description tab
        '.sheet-body .tab.active',           // Active tab
        '.sheet-body',                       // Sheet body
        '.window-content form',              // Form content
        '.window-content'                    // Window content
      ];

      let targetContainer = null;
      for (const selector of targetSelectors) {
        targetContainer = $html.find(selector);
        if (targetContainer.length > 0) {
          console.log(`${MODULE_ID} | Found target container: ${selector} (${targetContainer.length} elements)`);
          break;
        }
      }

      if (!targetContainer || targetContainer.length === 0) {
        console.warn(`${MODULE_ID} | No suitable container found for spell management interface`);
        console.log(`${MODULE_ID} | Available elements:`, $html.find('*').map((i, el) => el.tagName + (el.className ? '.' + el.className.replace(/\s+/g, '.') : '')).get());
        return;
      }

      // Remove any existing ring management interface to prevent duplicates
      $html.find('.ring-spell-management').remove();

      // Create the spell management section
      const spellManagementSection = $(`
        <div class="ring-spell-management" style="border: 2px solid #4169e1; border-radius: 8px; padding: 15px; margin: 10px 0; background: #f8f9ff;">
          <h3 style="margin: 0 0 15px 0; color: #4169e1; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-magic"></i>
            Spell Storage Management
          </h3>

          <div class="capacity-display" style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span><strong>Capacity:</strong> ${usedLevels}/${MAX_SPELL_LEVELS} spell levels used</span>
              <span style="color: ${remainingLevels > 0 ? '#28a745' : '#dc3545'};">
                <strong>${remainingLevels} levels remaining</strong>
              </span>
            </div>
            <div class="capacity-bar" style="width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden;">
              <div class="capacity-fill" style="width: ${(usedLevels / MAX_SPELL_LEVELS) * 100}%; height: 100%; background: linear-gradient(90deg, #28a745, #ffc107, #dc3545); transition: width 0.3s ease;"></div>
            </div>
          </div>

          <div class="stored-spells-summary" style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0;">Stored Spells (${storedSpells.length})</h4>
            <div class="spells-list" style="max-height: 200px; overflow-y: auto;">
              ${storedSpells.length === 0 ?
    '<p style="color: #666; font-style: italic;">No spells currently stored</p>' :
    storedSpells.map((spell, index) => `
                  <div class="stored-spell-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px; margin: 4px 0; background: white; border-radius: 4px; border-left: 4px solid #4169e1;">
                    <div>
                      <strong>${spell.name || 'Unknown Spell'}</strong> (Level ${spell.level || 1})
                      <br><small style="color: #666;">Cast by: ${spell.originalCaster?.name || 'Unknown'}</small>
                    </div>
                    <div style="display: flex; gap: 5px;">
                      <button class="cast-spell-btn" data-spell-index="${index}" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-magic"></i> Cast
                      </button>
                      <button class="remove-spell-btn" data-spell-index="${index}" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-trash"></i> Remove
                      </button>
                    </div>
                  </div>
                `).join('')
}
            </div>
          </div>

          <div class="management-buttons" style="display: flex; gap: 10px; justify-content: center;">
            <button class="open-full-interface-btn" style="background: #4169e1; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
              <i class="fas fa-cog"></i> Open Full Spell Management
            </button>
            <button class="store-spell-btn" style="background: #17a2b8; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
              <i class="fas fa-plus"></i> Store New Spell
            </button>
          </div>
        </div>
      `);

      // Add event handlers
      this.attachItemSheetEventHandlers(spellManagementSection, ring);

      // Insert the section into the item sheet
      targetContainer.first().append(spellManagementSection);

      console.log(`${MODULE_ID} | ✅ Successfully added spell management interface to ${ring.name}`);

    } catch (error) {
      console.error(`${MODULE_ID} | Error in addSpellManagementToItemSheet:`, error);
    }
  }

  /**
   * Attach event handlers to the item sheet spell management interface
   */
  static attachItemSheetEventHandlers(spellManagementSection, ring) {
    // Open full interface button
    spellManagementSection.find('.open-full-interface-btn').on('click', (event) => {
      event.preventDefault();
      console.log(`${MODULE_ID} | Opening full interface for ${ring.name}`);

      // Find the actor who owns this ring
      const actor = ring.parent;
      if (actor) {
        this.openRingInterface(actor, ring);
      } else {
        ui.notifications.warn('Cannot open ring interface: ring is not owned by a character');
      }
    });

    // Store new spell button
    spellManagementSection.find('.store-spell-btn').on('click', (event) => {
      event.preventDefault();
      console.log(`${MODULE_ID} | Store spell button clicked for ${ring.name}`);

      const actor = ring.parent;
      if (actor) {
        // Open the ring interface in "store spell" mode
        const ringInterface = new RingInterface(actor, ring);
        ringInterface.render(true);

        // Trigger the store spell dialog after a short delay
        setTimeout(() => {
          const storeButton = ringInterface.element.find('.store-spell-btn');
          if (storeButton.length > 0) {
            storeButton.click();
          }
        }, 500);
      } else {
        ui.notifications.warn('Cannot store spell: ring is not owned by a character');
      }
    });

    // Cast spell buttons
    spellManagementSection.find('.cast-spell-btn').on('click', async(event) => {
      event.preventDefault();
      const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
      console.log(`${MODULE_ID} | Cast spell button clicked for spell index ${spellIndex}`);

      const actor = ring.parent;
      if (actor) {
        await this.castSpellFromRing(actor, ring, spellIndex);

        // Refresh the item sheet to show updated spell list
        if (ring.sheet && ring.sheet.rendered) {
          ring.sheet.render(false);
        }
      } else {
        ui.notifications.warn('Cannot cast spell: ring is not owned by a character');
      }
    });

    // Remove spell buttons
    spellManagementSection.find('.remove-spell-btn').on('click', async(event) => {
      event.preventDefault();
      const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
      console.log(`${MODULE_ID} | Remove spell button clicked for spell index ${spellIndex}`);

      const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
      const spell = ringData.storedSpells[spellIndex];

      if (!spell) {
        ui.notifications.error('Spell not found');
        return;
      }

      // Confirm removal
      const confirmed = await Dialog.confirm({
        title: 'Remove Spell',
        content: `<p>Are you sure you want to remove <strong>${spell.name}</strong> from the ring?</p>
                  <p><em>This action cannot be undone.</em></p>`,
        yes: () => true,
        no: () => false
      });

      if (confirmed) {
        const actor = ring.parent;
        if (actor) {
          await this.removeSpellFromRing(actor, ring, spellIndex);

          // Refresh the item sheet to show updated spell list
          if (ring.sheet && ring.sheet.rendered) {
            ring.sheet.render(false);
          }
        } else {
          ui.notifications.warn('Cannot remove spell: ring is not owned by a character');
        }
      }
    });
  }

  /**
   * Detect the type of character sheet being used
   */
  static detectSheetType(sheet) {
    const className = sheet.constructor.name;
    const sheetElement = sheet.element;

    // Check for specific sheet types
    if (className.includes('Tidy5e') || sheetElement.hasClass('tidy5e')) {
      return 'tidy5e';
    }
    if (className.includes('DarkMode') || sheetElement.hasClass('dark-mode')) {
      return 'darkmode';
    }
    if (className.includes('ActorSheet5eCharacter')) {
      return 'dnd5e-default';
    }
    if (className.includes('ActorSheet5e')) {
      return 'dnd5e-legacy';
    }

    // Check for common sheet indicators in the DOM
    if (sheetElement.find('.tidy5e-spells').length > 0) {
      return 'tidy5e';
    }
    if (sheetElement.find('.spellcasting-ability').length > 0) {
      return 'dnd5e-modern';
    }

    return 'unknown';
  }

  /**
   * Get sheet-specific selectors for finding spell containers
   */
  static getSheetSpecificSelectors(sheetType) {
    const baseSelectors = [
      // Standard D&D 5e selectors
      '.tab[data-tab="spells"]',
      '.tab[data-tab="features"]',
      '.tab.spells',
      '.tab.features',
      // Content area selectors
      '.spells',
      '.spellbook',
      '.spellcasting',
      '.spell-list',
      '.spells-content'
    ];

    switch (sheetType) {
    case 'tidy5e':
      return [
        '.tidy5e-spells',
        '.spells-tab',
        '.tab[data-tab="spells"]',
        '.spellbook',
        ...baseSelectors
      ];

    case 'dnd5e-default':
    case 'dnd5e-modern':
      return [
        '.tab[data-tab="spells"]',
        '.spellbook',
        '.spellcasting',
        '.tab.spells',
        ...baseSelectors
      ];

    case 'darkmode':
      return [
        '.tab[data-tab="spells"]',
        '.dark-mode .spells',
        '.spellbook',
        ...baseSelectors
      ];

    default:
      return [
        ...baseSelectors,
        // Additional fallback selectors
        '.features-tab',
        '.inventory',
        '.tab-content[data-tab="spells"]',
        '.sheet-body .spells',
        '[data-tab="spells"]',
        '.tab-content'
      ];
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
        if (actor.sheet && actor.sheet.rendered) {
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
    if (!actor) {
      console.warn(`${MODULE_ID} | No actor provided to findRingsOnActor`);
      return [];
    }

    console.log(`${MODULE_ID} | Searching for rings on ${actor.name}`);
    const rings = [];

    // Find all rings that match our criteria (equipped or not)
    actor.items.forEach(item => {
      console.log(`${MODULE_ID} | Checking item: ${item.name} (type: ${item.type}, equipped: ${item.system?.equipped})`);

      // Use our improved detection method
      if (this.isRingOfSpellStoring(item)) {
        console.log(`${MODULE_ID} | Found Ring of Spell Storing: ${item.name} (equipped: ${item.system?.equipped})`);
        rings.push(item);
      }
    });

    console.log(`${MODULE_ID} | Found ${rings.length} rings total`);
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
  static async addAllRingSpellsToSpellList(html, actor, rings, sheetType = 'unknown') {
    try {
      console.log(`${MODULE_ID} | Adding ring spells to spell list for ${actor.name} (${rings.length} rings, sheet: ${sheetType})`);

      // Get sheet-specific selectors based on detected type
      const possibleTabSelectors = this.getSheetSpecificSelectors(sheetType);

      let spellsTab = null;
      for (const selector of possibleTabSelectors) {
        spellsTab = html.find(selector);
        if (spellsTab.length > 0) {
          console.log(`${MODULE_ID} | Found target container using selector: ${selector}`);
          break;
        }
      }

      if (!spellsTab || spellsTab.length === 0) {
        console.log(`${MODULE_ID} | No suitable container found, trying fallback approach`);
        this.debugSheetStructure(html);

        // Try fallback injection
        const fallbackSuccess = this.tryFallbackUIInjection(html, actor, rings);
        if (!fallbackSuccess) {
          console.warn(`${MODULE_ID} | All UI injection methods failed`);
        }
        return;
      }

      // Remove any existing ring spell sections
      html.find('.ring-spells-section').remove();

      // Add a section for each ring
      for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
        const ring = rings[ringIndex];
        const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        const storedSpells = ringData.storedSpells || [];

        console.log(`${MODULE_ID} | Ring ${ringIndex + 1}: ${ring.name} has ${storedSpells.length} stored spells`);

        // Always add ring section, even if no spells (for management button)
        await this.addSingleRingSpellsToSpellList(html, actor, ring, ringIndex, spellsTab);
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Error in addAllRingSpellsToSpellList:`, error);
    }
  }

  /**
   * Add spells from a single ring to the spell list
   * @deprecated - Moving to item-centric design, this method is no longer used
   */
  static async addSingleRingSpellsToSpellList(html, actor, ring, ringIndex, spellsTab) {
    try {
      const ringData = ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
      const storedSpells = ringData.storedSpells || [];

      // Create unique ring identifier
      const ringId = ring.id;
      const usedLevels = storedSpells.reduce((sum, s) => sum + s.level, 0);

      console.log(`${MODULE_ID} | Creating ring section for ${ring.name} with ${storedSpells.length} spells`);

      // Create ring spells section with improved styling and visibility
      const ringSpellsSection = $(`
        <div class="ring-spells-section" data-ring-id="${ringId}" style="margin: 10px 0; border: 2px solid #8b4513; border-radius: 5px; padding: 10px; background: #f9f9f9;">
          <div class="ring-spells-header" style="display: flex; align-items: center; margin-bottom: 8px;">
            <h3 style="margin: 0; color: #8b4513; font-size: 16px; font-weight: bold;">
              <i class="fas fa-ring" style="margin-right: 5px;"></i>
              ${ring.name}
            </h3>
            <span style="margin-left: auto; font-size: 12px; color: #666; font-weight: bold;">
              ${usedLevels}/${MAX_SPELL_LEVELS} levels
            </span>
            <button class="manage-ring-btn" data-ring-id="${ringId}"
                    style="margin-left: 8px; background: #2196f3; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 11px; cursor: pointer;">
              <i class="fas fa-cog"></i> Manage
            </button>
          </div>
          <div class="ring-spells-list" data-ring-id="${ringId}">
            ${storedSpells.length === 0 ? '<p style="color: #666; font-style: italic; margin: 5px 0;">No spells stored</p>' : ''}
          </div>
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
          console.log(`${MODULE_ID} | Opening ring interface for ${ring.name}`);
          this.openRingInterface(actor, ring);
        }
      });

      // Add the section to the target container
      spellsTab.append(ringSpellsSection);

      console.log(`${MODULE_ID} | Successfully added ring section for ${ring.name} with ${storedSpells.length} spells`);
    } catch (error) {
      console.error(`${MODULE_ID} | Error in addSingleRingSpellsToSpellList:`, error);
    }
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
   * Debug actor items to help troubleshoot ring detection
   */
  static debugActorItems(actor) {
    console.log(`${MODULE_ID} | Debugging items for ${actor.name}:`);
    console.log(`${MODULE_ID} | Total items: ${actor.items.size}`);

    const equipment = actor.items.filter(item => item.type === 'equipment');
    console.log(`${MODULE_ID} | Equipment items: ${equipment.length}`);

    equipment.forEach(item => {
      console.log(`${MODULE_ID} |   - ${item.name} (equipped: ${item.system.equipped})`);
    });

    const ringLike = actor.items.filter(item =>
      item.name.toLowerCase().includes('ring') ||
      item.name.toLowerCase().includes('spell storing')
    );
    console.log(`${MODULE_ID} | Ring-like items: ${ringLike.length}`);
    ringLike.forEach(item => {
      console.log(`${MODULE_ID} |   - ${item.name} (type: ${item.type}, equipped: ${item.system.equipped})`);
    });
  }

  /**
   * Debug sheet structure to help troubleshoot UI injection
   */
  static debugSheetStructure(html) {
    console.log(`${MODULE_ID} | Debugging sheet structure:`);

    const tabs = html.find('.tab');
    console.log(`${MODULE_ID} | Found ${tabs.length} tabs:`);
    tabs.each((i, tab) => {
      const $tab = $(tab);
      console.log(`${MODULE_ID} |   Tab ${i}: data-tab="${$tab.data('tab')}", class="${$tab.attr('class')}"`);
    });

    const spellElements = html.find('[class*="spell"], [data-tab*="spell"]');
    console.log(`${MODULE_ID} | Found ${spellElements.length} spell-related elements`);

    // Log the first few elements for inspection
    spellElements.slice(0, 3).each((i, el) => {
      const $el = $(el);
      console.log(`${MODULE_ID} |   Spell element ${i}: class="${$el.attr('class')}", data-tab="${$el.data('tab')}"`);
    });
  }

  /**
   * Try fallback UI injection methods
   */
  static tryFallbackUIInjection(html, actor, rings) {
    console.log(`${MODULE_ID} | Attempting fallback UI injection`);

    // Method 1: Try to inject into the main content area
    const mainContent = html.find('.sheet-body, .window-content, .tab-content');
    if (mainContent.length > 0) {
      console.log(`${MODULE_ID} | Trying injection into main content area`);

      const ringSection = this.createSimpleRingSection(actor, rings);
      mainContent.first().prepend(ringSection);

      console.log(`${MODULE_ID} | Fallback injection successful`);
      return true;
    }

    // Method 2: Try to inject at the very top of the sheet
    const sheetHeader = html.find('.sheet-header, .window-header');
    if (sheetHeader.length > 0) {
      console.log(`${MODULE_ID} | Trying injection after sheet header`);

      const ringSection = this.createSimpleRingSection(actor, rings);
      sheetHeader.after(ringSection);

      console.log(`${MODULE_ID} | Header fallback injection successful`);
      return true;
    }

    // Method 3: Last resort - inject anywhere in the HTML
    if (html.length > 0) {
      console.log(`${MODULE_ID} | Last resort injection`);

      const ringSection = this.createSimpleRingSection(actor, rings);
      html.prepend(ringSection);

      console.log(`${MODULE_ID} | Last resort injection successful`);
      return true;
    }

    return false;
  }

  /**
   * Create a simple ring section for fallback injection
   */
  static createSimpleRingSection(actor, rings) {
    const ringCount = rings.length;
    const ringNames = rings.map(r => r.name).join(', ');

    const section = $(`
      <div class="ring-fallback-section" style="background: #f0f8ff; border: 2px solid #4169e1; border-radius: 5px; padding: 10px; margin: 10px; position: relative; z-index: 1000;">
        <h3 style="margin: 0 0 10px 0; color: #4169e1;">
          <i class="fas fa-ring"></i> Ring of Spell Storing (${ringCount} found)
        </h3>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">
          Rings: ${ringNames}
        </p>
        <div class="ring-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
        </div>
      </div>
    `);

    const buttonContainer = section.find('.ring-buttons');

    rings.forEach((ring, _index) => {
      const button = $(`
        <button class="ring-manage-btn" data-ring-id="${ring.id}"
                style="background: #4169e1; color: white; border: none; border-radius: 3px; padding: 5px 10px; font-size: 11px; cursor: pointer;">
          <i class="fas fa-cog"></i> Manage ${ring.name}
        </button>
      `);

      button.on('click', (event) => {
        event.preventDefault();
        console.log(`${MODULE_ID} | Opening ring interface for ${ring.name}`);

        // Find the actor who owns this ring
        const actor = ring.parent;
        if (actor) {
          this.openRingInterface(actor, ring);
        } else {
          ui.notifications.warn('Cannot open ring interface: ring is not owned by a character');
        }
      });

      buttonContainer.append(button);
    });

    return section;
  }

  /**
   * Force render an actor sheet to trigger ring UI
   */
  static forceRenderSheet(actor) {
    console.log(`${MODULE_ID} | Force rendering sheet for ${actor.name}`);

    if (actor.sheet && actor.sheet.rendered) {
      console.log(`${MODULE_ID} | Re-rendering existing sheet`);
      actor.sheet.render(false);
    } else {
      console.log(`${MODULE_ID} | Opening new sheet`);
      actor.sheet.render(true);
    }

    return true;
  }

  /**
   * Test UI injection on a specific actor
   */
  static testUIInjection(actor) {
    console.log(`${MODULE_ID} | Testing UI injection for ${actor.name}`);

    const rings = this.findRingsOnActor(actor);
    console.log(`${MODULE_ID} | Found ${rings.length} rings`);

    if (rings.length === 0) {
      console.warn(`${MODULE_ID} | No rings found for testing`);
      return false;
    }

    const sheet = actor.sheet;
    if (!sheet || !sheet.rendered) {
      console.warn(`${MODULE_ID} | Actor sheet not rendered`);
      return false;
    }

    const html = sheet.element;
    this.addAllRingSpellsToSpellList(html, actor, rings);

    return true;
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

  /**
   * Get the best available actor (selected token > assigned character)
   */
  static getSelectedActor() {
    // Try selected token first (for GMs)
    const selectedToken = canvas.tokens.controlled[0];
    if (selectedToken?.actor) {
      console.log(`${MODULE_ID} | Using selected token: ${selectedToken.actor.name}`);
      return selectedToken.actor;
    }

    // Fall back to assigned character
    const assignedCharacter = game.user.character;
    if (assignedCharacter) {
      console.log(`${MODULE_ID} | Using assigned character: ${assignedCharacter.name}`);
      return assignedCharacter;
    }

    console.warn(`${MODULE_ID} | No actor available (no selected token or assigned character)`);
    return null;
  }

  /**
   * Test UI injection with selected token (for GM use)
   */
  static testWithSelectedToken() {
    const actor = this.getSelectedActor();
    if (!actor) {
      console.error(`${MODULE_ID} | No actor available for testing`);
      return false;
    }

    console.log(`${MODULE_ID} | Testing UI injection with: ${actor.name}`);
    return this.testUIInjection(actor);
  }

  /**
   * Open the ring management dialog
   */
  static async openRingManagementDialog(ring) {
    try {
      console.log(`${MODULE_ID} | Opening management dialog for ${ring.name}`);

      const storedSpells = this.getRingSpellData(ring);
      const usedLevels = this.calculateUsedLevels(ring);
      const remainingLevels = MAX_SPELL_LEVELS - usedLevels;

      // Create dialog content
      let content = `
        <div class="ring-management-dialog">
          <h3>🔮 ${ring.name}</h3>
          <div class="capacity-info">
            <p><strong>Capacity:</strong> ${usedLevels}/${MAX_SPELL_LEVELS} spell levels used</p>
            <p><strong>Remaining:</strong> ${remainingLevels} spell levels available</p>
          </div>
          <hr>
          <h4>Stored Spells:</h4>
      `;

      if (storedSpells.length === 0) {
        content += '<p><em>No spells currently stored in this ring.</em></p>';
      } else {
        content += '<div class="stored-spells-list">';
        storedSpells.forEach((spell, index) => {
          content += `
            <div class="stored-spell" data-spell-index="${index}">
              <div class="spell-info">
                <strong>${spell.name}</strong> (Level ${spell.level})
                <br><small>Caster: ${spell.originalCaster} | DC: ${spell.spellSaveDC}</small>
              </div>
              <div class="spell-actions">
                <button type="button" class="cast-spell-btn" data-spell-index="${index}">
                  <i class="fas fa-magic"></i> Cast
                </button>
                <button type="button" class="remove-spell-btn" data-spell-index="${index}">
                  <i class="fas fa-trash"></i> Remove
                </button>
              </div>
            </div>
          `;
        });
        content += '</div>';
      }

      content += `
          <hr>
          <div class="dialog-actions">
            <button type="button" class="store-new-spell-btn">
              <i class="fas fa-plus-circle"></i> Store New Spell
            </button>
          </div>
        </div>
      `;

      // Create and show dialog
      new Dialog({
        title: `Ring Management: ${ring.name}`,
        content: content,
        buttons: {
          close: {
            label: 'Close',
            callback: () => {}
          }
        },
        render: (html) => {
          // Attach event handlers
          html.find('.cast-spell-btn').click((event) => {
            const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
            this.castStoredSpell(ring, spellIndex);
          });

          html.find('.remove-spell-btn').click((event) => {
            const spellIndex = parseInt(event.currentTarget.dataset.spellIndex);
            this.removeStoredSpell(ring, spellIndex);
          });

          html.find('.store-new-spell-btn').click(() => {
            this.openStoreSpellDialog(ring);
          });
        },
        default: 'close'
      }).render(true);

    } catch (error) {
      console.error(`${MODULE_ID} | Error opening ring management dialog:`, error);
      ui.notifications.error('Failed to open ring management dialog');
    }
  }

  /**
   * Open dialog to store a new spell in the ring
   */
  static async openStoreSpellDialog(ring) {
    try {
      const actor = ring.parent;
      if (!actor) {
        ui.notifications.error('Ring must be owned by a character to store spells');
        return;
      }

      // Get available spells from the actor
      const availableSpells = actor.items.filter(item =>
        item.type === 'spell' && item.system.level <= 5
      );

      if (availableSpells.length === 0) {
        ui.notifications.warn('No spells available to store (only spells of level 1-5 can be stored)');
        return;
      }

      // Create spell selection content
      let content = `
        <div class="store-spell-dialog">
          <h3>📥 Store Spell in ${ring.name}</h3>
          <p>Select a spell to store in the ring:</p>
          <select id="spell-select" style="width: 100%; margin: 10px 0;">
            <option value="">-- Select a Spell --</option>
      `;

      availableSpells.forEach(spell => {
        const level = spell.system.level;
        // const usedLevels = this.calculateUsedLevels(ring);
        const canStore = this.hasCapacity(ring, level);
        const disabled = canStore ? '' : 'disabled';

        content += `
          <option value="${spell.id}" ${disabled}>
            ${spell.name} (Level ${level}) ${canStore ? '' : '- No Capacity'}
          </option>
        `;
      });

      content += `
          </select>
          <div class="capacity-warning" style="margin: 10px 0; padding: 8px; background: #fff3cd; border-radius: 4px;">
            <small><strong>Note:</strong> Ring capacity is ${MAX_SPELL_LEVELS} spell levels total.</small>
          </div>
        </div>
      `;

      new Dialog({
        title: 'Store Spell',
        content: content,
        buttons: {
          store: {
            label: 'Store Spell',
            callback: (html) => {
              const spellId = html.find('#spell-select').val();
              if (spellId) {
                this.storeSpellFromDialog(ring, spellId);
              } else {
                ui.notifications.warn('Please select a spell to store');
              }
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => {}
          }
        },
        default: 'store'
      }).render(true);

    } catch (error) {
      console.error(`${MODULE_ID} | Error opening store spell dialog:`, error);
      ui.notifications.error('Failed to open store spell dialog');
    }
  }

  /**
   * Store a spell in the ring from dialog
   */
  static async storeSpellFromDialog(ring, spellId) {
    try {
      const actor = ring.parent;
      const spell = actor.items.get(spellId);

      if (!spell) {
        ui.notifications.error('Spell not found');
        return;
      }

      const spellLevel = spell.system.level;

      if (!this.hasCapacity(ring, spellLevel)) {
        ui.notifications.error(`Ring does not have capacity for a level ${spellLevel} spell`);
        return;
      }

      // Get current stored spells using the proper method
      const currentStoredSpells = this.getRingSpellData(ring);
      console.log(`${MODULE_ID} | Current stored spells:`, currentStoredSpells);

      // Create spell data for storage
      const spellData = {
        id: spell.id,
        name: spell.name,
        level: spellLevel,
        originalCaster: {
          id: actor.id,
          name: actor.name,
          spellAttack: actor.system.attributes.spellcasting?.attack || 0,
          saveDC: actor.system.attributes.spellcasting?.dc || 8,
          level: actor.system.details?.level || 1
        },
        storedAt: Date.now(),
        spellData: foundry.utils.duplicate(spell.system) // Store full spell data
      };

      console.log(`${MODULE_ID} | Storing spell data:`, spellData);

      // Add to stored spells array
      const updatedStoredSpells = [...currentStoredSpells, spellData];
      console.log(`${MODULE_ID} | Updated stored spells array:`, updatedStoredSpells);

      // Update the ring using the proper method
      const success = await this.setRingSpellData(ring, updatedStoredSpells);

      if (success) {
        ui.notifications.info(`${spell.name} has been stored in ${ring.name}`);
        console.log(`${MODULE_ID} | Successfully stored spell ${spell.name} in ${ring.name}`);

        // Refresh the item sheet if it's open
        if (ring.sheet && ring.sheet.rendered) {
          ring.sheet.render(false);
        }
      } else {
        ui.notifications.error('Failed to store spell in ring');
        console.error(`${MODULE_ID} | Failed to update ring data`);
      }

    } catch (error) {
      console.error(`${MODULE_ID} | Error storing spell in ring:`, error);
      ui.notifications.error(`Failed to store spell in ring: ${error.message}`);
    }
  }

  /**
   * Cast a stored spell from the ring
   */
  static async castStoredSpell(ring, spellIndex) {
    try {
      const storedSpells = this.getRingSpellData(ring);
      const spell = storedSpells[spellIndex];

      if (!spell) {
        ui.notifications.error('Spell not found in ring');
        return;
      }

      // Note: In a full implementation, you would create a temporary spell item
      // and use the original caster's stats for the actual spell casting
      // For now, we just show the notification and remove the spell

      ui.notifications.info(`Casting ${spell.name} from ${ring.name} (using ${spell.originalCaster}'s stats)`);

      // Remove the spell from the ring after casting
      storedSpells.splice(spellIndex, 1);
      await this.setRingSpellData(ring, storedSpells);

      console.log(`${MODULE_ID} | Cast spell ${spell.name} from ${ring.name}`);

    } catch (error) {
      console.error(`${MODULE_ID} | Error casting stored spell:`, error);
      ui.notifications.error('Failed to cast stored spell');
    }
  }

  /**
   * Remove a stored spell from the ring
   */
  static async removeStoredSpell(ring, spellIndex) {
    try {
      const storedSpells = this.getRingSpellData(ring);
      const spell = storedSpells[spellIndex];

      if (!spell) {
        ui.notifications.error('Spell not found in ring');
        return;
      }

      // Confirm removal
      const confirmed = await Dialog.confirm({
        title: 'Remove Stored Spell',
        content: `<p>Are you sure you want to remove <strong>${spell.name}</strong> from ${ring.name}?</p>
                  <p><em>This action cannot be undone.</em></p>`,
        yes: () => true,
        no: () => false
      });

      if (confirmed) {
        storedSpells.splice(spellIndex, 1);
        await this.setRingSpellData(ring, storedSpells);

        ui.notifications.info(`${spell.name} has been removed from ${ring.name}`);
        console.log(`${MODULE_ID} | Removed spell ${spell.name} from ${ring.name}`);

        // Refresh the management dialog if it's open
        this.openRingManagementDialog(ring);
      }

    } catch (error) {
      console.error(`${MODULE_ID} | Error removing stored spell:`, error);
      ui.notifications.error('Failed to remove stored spell');
    }
  }

  /**
   * Show ring contents in a simple dialog
   */
  static showRingContents(ring) {
    const storedSpells = this.getRingSpellData(ring);
    const usedLevels = this.calculateUsedLevels(ring);

    let content = `
      <div class="ring-contents">
        <h3>📋 ${ring.name} Contents</h3>
        <p><strong>Capacity:</strong> ${usedLevels}/${MAX_SPELL_LEVELS} spell levels used</p>
        <hr>
    `;

    if (storedSpells.length === 0) {
      content += '<p><em>This ring contains no stored spells.</em></p>';
    } else {
      content += '<ul>';
      storedSpells.forEach(spell => {
        content += `
          <li>
            <strong>${spell.name}</strong> (Level ${spell.level})
            <br><small>Original Caster: ${spell.originalCaster?.name || 'Unknown'} | Spell Save DC: ${spell.originalCaster?.saveDC || 'Unknown'}</small>
          </li>
        `;
      });
      content += '</ul>';
    }

    content += '</div>';

    new Dialog({
      title: `Ring Contents: ${ring.name}`,
      content: content,
      buttons: {
        close: {
          label: 'Close',
          callback: () => {}
        }
      },
      default: 'close'
    }).render(true);
  }

  /**
   * Add a header button to Ring of Spell Storing item sheets
   */
  static addRingHeaderButton(html, ring) {
    try {
      // Ensure html is a jQuery object
      const $html = html instanceof jQuery ? html : $(html);
      if (!$html || $html.length === 0) {
        console.warn(`${MODULE_ID} | Invalid HTML object provided`);
        return;
      }

      // Find the header buttons area
      const headerSelectors = [
        '.window-header .header-buttons',
        '.sheet-header .header-buttons',
        '.window-title',
        '.sheet-title'
      ];

      let headerContainer = null;
      for (const selector of headerSelectors) {
        headerContainer = $html.find(selector);
        if (headerContainer.length > 0) {
          break;
        }
      }

      if (!headerContainer || headerContainer.length === 0) {
        console.log(`${MODULE_ID} | No header container found for button`);
        return;
      }

      // Remove existing button to prevent duplicates
      $html.find('.ring-management-header-btn').remove();

      // Create header button
      const headerButton = $(`
        <a class="ring-management-header-btn" title="Manage Ring Spells" style="color: #4169e1; margin-left: 5px;">
          <i class="fas fa-magic"></i>
        </a>
      `);

      // Add click handler
      headerButton.on('click', (event) => {
        event.preventDefault();
        console.log(`${MODULE_ID} | Header button clicked for ${ring.name}`);

        // Find the actor who owns this ring
        const actor = ring.parent;
        if (actor) {
          this.openRingInterface(actor, ring);
        } else {
          ui.notifications.warn('Cannot open ring interface: ring is not owned by a character');
        }
      });

      // Add to header
      headerContainer.first().append(headerButton);
      console.log(`${MODULE_ID} | Added header button to ${ring.name}`);

    } catch (error) {
      console.error(`${MODULE_ID} | Error adding header button:`, error);
    }
  }
}

// Initialize module when Foundry is ready
Hooks.once('init', () => {
  console.log('ring-of-spell-storing | Init hook fired');
  try {
    RingOfSpellStoring.initialize();
    console.log('ring-of-spell-storing | Module initialized successfully');
  } catch (error) {
    console.error('ring-of-spell-storing | Error during initialization:', error);
  }
});

// Additional ready hook for safety
Hooks.once('ready', () => {
  console.log('ring-of-spell-storing | Ready hook fired');

  // Verify module is working
  const module = game.modules.get('ring-of-spell-storing');
  if (module?.active) {
    console.log('ring-of-spell-storing | Module is active and ready');

    // Make API globally available for debugging
    if (module.api) {
      window.RingOfSpellStoringAPI = module.api;
      console.log('ring-of-spell-storing | API made globally available');
    }
  } else {
    console.error('ring-of-spell-storing | Module not active in ready hook');
  }
});

// Export for API access
export { RingOfSpellStoring };
