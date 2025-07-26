/**
 * Quick Test Script for Ring of Spell Storing
 * Run this in the browser console to diagnose issues
 */

// Quick diagnostic function you can run in the console
window.ringQuickTest = function() {
  console.log('=== RING OF SPELL STORING QUICK TEST ===');

  const MODULE_ID = 'ring-of-spell-storing';

  // 1. Check if module is loaded
  const module = game.modules.get(MODULE_ID);
  console.log('1. Module loaded:', !!module);
  console.log('   Module active:', module?.active);

  if (!module?.active) {
    console.error('❌ Module is not active! Enable it in the module settings.');
    return false;
  }

  // 2. Check API availability
  const api = module.api;
  console.log('2. API available:', !!api);

  if (!api) {
    console.error('❌ Module API not available! Module may not have initialized properly.');
    return false;
  }

  // 3. Check current character
  const actor = game.user.character;
  console.log('3. Current character:', actor?.name || 'None selected');

  if (!actor) {
    console.error('❌ No character selected! Please select a character token or set a default character.');
    return false;
  }

  // 4. Check for rings
  const rings = api.findRingsOnActor(actor);
  console.log('4. Rings found:', rings.length);

  if (rings.length === 0) {
    console.warn('⚠️ No rings found. Creating a test ring...');
    createTestRing(actor, api);
    return false;
  }

  rings.forEach((ring, i) => {
    console.log(`   Ring ${i + 1}: ${ring.name} (ID: ${ring.id})`);
    const ringData = ring.system.flags?.[MODULE_ID] || {};
    console.log(`   Stored spells: ${ringData.storedSpells?.length || 0}`);
  });

  // 5. Check character sheet
  const sheet = actor.sheet;
  console.log('5. Character sheet:', sheet?.constructor.name || 'Not rendered');

  if (!sheet?.rendered) {
    console.error('❌ Character sheet not open! Please open the character sheet.');
    return false;
  }

  // 6. Test DOM selectors
  console.log('6. Testing DOM selectors...');
  const html = sheet.element;

  const selectors = [
    '.tab[data-tab="spells"]',
    '.tab[data-tab="features"]',
    '.spells',
    '.spellbook',
    '.tab.spells'
  ];

  let foundContainer = false;
  selectors.forEach(selector => {
    const elements = html.find(selector);
    console.log(`   ${selector}: ${elements.length} found`);
    if (elements.length > 0) {
      foundContainer = true;
    }
  });

  if (!foundContainer) {
    console.error('❌ No suitable spell container found in sheet!');
    console.log('Available tabs:');
    html.find('.tab, [data-tab]').each((i, tab) => {
      const $tab = $(tab);
      console.log(`   Tab: class="${$tab.attr('class')}" data-tab="${$tab.attr('data-tab')}"`);
    });
    return false;
  }

  // 7. Test manual UI injection
  console.log('7. Testing manual UI injection...');
  try {
    api.testUIInjection(actor);
    console.log('✅ Manual UI injection completed - check your character sheet!');
  } catch (error) {
    console.error('❌ Manual UI injection failed:', error);
    return false;
  }

  // 8. Run full diagnostics
  console.log('8. Running full diagnostics...');
  api.runDiagnostics(actor);

  console.log('=== TEST COMPLETE ===');
  console.log('✅ If you see ring sections on your character sheet, the module is working!');
  console.log('⚠️ If not, check the console errors above for specific issues.');

  return true;
};

// Helper function to create a test ring
async function createTestRing(actor, _api) {
  console.log('Creating test ring...');

  try {
    const ringData = {
      name: 'Ring of Spell Storing',
      type: 'equipment',
      system: {
        equipped: true,
        attunement: 1, // Required attunement
        rarity: 'rare',
        flags: {
          'ring-of-spell-storing': {
            storedSpells: []
          }
        }
      }
    };

    const ring = await actor.createEmbeddedDocuments('Item', [ringData]);
    console.log('✅ Test ring created:', ring[0].name);

    // Force sheet re-render
    if (actor.sheet.rendered) {
      actor.sheet.render(false);
    }

    console.log('🔄 Please run the test again now that you have a ring!');
    return ring[0];
  } catch (error) {
    console.error('❌ Failed to create test ring:', error);
    return null;
  }
}

// Also make the diagnostics available globally
window.ringDiagnostics = function(actor = null) {
  const module = game.modules.get('ring-of-spell-storing');
  if (module?.api?.runDiagnostics) {
    return module.api.runDiagnostics(actor);
  } else {
    console.error('Ring diagnostics not available');
    return false;
  }
};

console.log('Ring Quick Test loaded! Run ringQuickTest() in the console to diagnose issues.');
