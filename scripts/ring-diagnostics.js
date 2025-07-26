/**
 * Ring of Spell Storing Diagnostics
 * Helper script to diagnose button visibility issues
 */

const MODULE_ID = 'ring-of-spell-storing';
const RING_ITEM_NAME = 'Ring of Spell Storing';

/**
 * Diagnostic functions for troubleshooting ring button issues
 */
export class RingDiagnostics {

  /**
   * Check if the module is properly initialized
   */
  static checkModuleInitialization() {
    console.log('=== Ring Module Initialization Check ===');

    const module = game.modules.get(MODULE_ID);
    console.log('Module found:', !!module);
    console.log('Module active:', module?.active);
    console.log('Module API available:', !!module?.api);

    if (module?.api) {
      console.log('Available API methods:', Object.keys(module.api));
    }

    return !!module?.active;
  }

  /**
   * Check module settings
   */
  static checkModuleSettings() {
    console.log('=== Module Settings Check ===');

    try {
      const showInterface = game.settings.get(MODULE_ID, 'showInterface');
      const allowSelfSpells = game.settings.get(MODULE_ID, 'allowSelfSpells');

      console.log('Show Interface setting:', showInterface);
      console.log('Allow Self Spells setting:', allowSelfSpells);

      return showInterface;
    } catch (error) {
      console.error('Error reading settings:', error);
      return false;
    }
  }

  /**
   * Check for rings on all actors
   */
  static checkActorsForRings() {
    console.log('=== Actors Ring Check ===');

    const actors = game.actors.filter(actor => actor.type === 'character');
    console.log(`Found ${actors.length} character actors`);

    actors.forEach(actor => {
      console.log(`\nChecking actor: ${actor.name}`);

      const rings = actor.items.filter(item =>
        item.name.toLowerCase().includes('ring of spell storing') ||
        item.name === RING_ITEM_NAME
      );

      console.log(`  Found ${rings.length} potential ring items:`);
      rings.forEach(ring => {
        console.log(`    - ${ring.name} (type: ${ring.type}, equipped: ${ring.system.equipped})`);
        console.log(`      ID: ${ring.id}`);
        console.log(`      Flags:`, ring.system.flags);
      });

      // Check specifically for equipped rings
      const equippedRings = rings.filter(ring =>
        ring.type === 'equipment' && ring.system.equipped
      );
      console.log(`  Equipped rings: ${equippedRings.length}`);
    });
  }

  /**
   * Test the findRingOnActor method
   */
  static testFindRingOnActor(actor) {
    console.log(`=== Testing findRingOnActor for ${actor.name} ===`);

    // Replicate the findRingOnActor logic
    const ring = actor.items.find(item =>
      item.name === RING_ITEM_NAME &&
      item.type === 'equipment' &&
      item.system.equipped
    );

    console.log('Ring found by findRingOnActor logic:', !!ring);
    if (ring) {
      console.log('Ring details:', {
        name: ring.name,
        type: ring.type,
        equipped: ring.system.equipped,
        id: ring.id
      });
    }

    // Also check for partial matches
    const partialMatches = actor.items.filter(item =>
      item.name.toLowerCase().includes('ring of spell storing')
    );

    console.log('Partial name matches:', partialMatches.length);
    partialMatches.forEach(item => {
      console.log(`  - "${item.name}" (exact match: ${item.name === RING_ITEM_NAME})`);
    });

    return ring;
  }

  /**
   * Test hook registration
   */
  static checkHookRegistration() {
    console.log('=== Hook Registration Check ===');

    // Check if our hooks are registered
    const hooks = Hooks._hooks;
    const relevantHooks = [
      'renderActorSheet5eCharacter',
      'dnd5e.useItem',
      'ready'
    ];

    relevantHooks.forEach(hookName => {
      const hookCallbacks = hooks[hookName] || [];
      console.log(`${hookName}: ${hookCallbacks.length} callbacks registered`);

      // Try to identify our callback
      const ourCallback = hookCallbacks.find(callback =>
        callback.fn.toString().includes('ring-of-spell-storing') ||
        callback.fn.toString().includes('RingOfSpellStoring')
      );
      console.log(`  Our callback found: ${!!ourCallback}`);
    });
  }

  /**
   * Test character sheet HTML structure
   */
  static checkCharacterSheetHTML(actor) {
    console.log(`=== Character Sheet HTML Check for ${actor.name} ===`);

    // Find the actor's sheet
    const sheet = actor.sheet;
    if (!sheet || !sheet.rendered) {
      console.log('Actor sheet not rendered');
      return false;
    }

    const html = sheet.element;
    if (!html) {
      console.log('Sheet HTML element not found');
      return false;
    }

    // Check for inventory tab
    const inventoryTab = html.find('.tab[data-tab="inventory"]');
    console.log('Inventory tab found:', inventoryTab.length > 0);

    if (inventoryTab.length > 0) {
      console.log('Inventory tab HTML structure:');
      console.log(inventoryTab[0].outerHTML.substring(0, 200) + '...');

      // Check for existing ring buttons
      const existingButtons = html.find('.ring-interface-btn');
      console.log('Existing ring buttons:', existingButtons.length);
    }

    // Check for alternative tab structures
    const allTabs = html.find('.tab');
    console.log('All tabs found:', allTabs.length);
    allTabs.each((i, tab) => {
      const $tab = $(tab);
      console.log(`  Tab ${i}: data-tab="${$tab.data('tab')}", class="${$tab.attr('class')}"`);
    });

    return inventoryTab.length > 0;
  }

  /**
   * Manually trigger the button addition
   */
  static manuallyAddButton(actor) {
    console.log(`=== Manually Adding Button for ${actor.name} ===`);

    const ring = this.testFindRingOnActor(actor);
    if (!ring) {
      console.log('No ring found, cannot add button');
      return false;
    }

    const sheet = actor.sheet;
    if (!sheet || !sheet.rendered) {
      console.log('Actor sheet not rendered');
      return false;
    }

    const html = sheet.element;
    const inventoryTab = html.find('.tab[data-tab="inventory"]');

    if (inventoryTab.length === 0) {
      console.log('Inventory tab not found');
      return false;
    }

    // Remove existing buttons first
    html.find('.ring-interface-btn').remove();

    // Add the button
    const button = $(`
      <button type="button" class="ring-interface-btn" style="margin: 5px; background: #2196f3; color: white; border: none; border-radius: 4px; padding: 8px 16px;">
        <i class="fas fa-ring"></i> Ring of Spell Storing Interface
      </button>
    `);

    button.on('click', () => {
      console.log('Ring button clicked!');
      // Import and use RingInterface
      import('./ring-interface.js').then(module => {
        new module.RingInterface(actor, ring).render(true);
      });
    });

    inventoryTab.prepend(button);
    console.log('Button added successfully');

    return true;
  }

  /**
   * Run all diagnostics
   */
  static runAllDiagnostics(actor = null) {
    console.log('🔍 Running Ring of Spell Storing Diagnostics...\n');

    this.checkModuleInitialization();
    console.log('');

    this.checkModuleSettings();
    console.log('');

    this.checkActorsForRings();
    console.log('');

    this.checkHookRegistration();
    console.log('');

    if (actor) {
      this.testFindRingOnActor(actor);
      console.log('');

      this.checkCharacterSheetHTML(actor);
      console.log('');
    }

    console.log('🔍 Diagnostics complete!');
  }
}

// Make available globally for console use
window.RingDiagnostics = RingDiagnostics;
