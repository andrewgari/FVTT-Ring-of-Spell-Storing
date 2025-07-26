/**
 * Quick Test Script for Ring of Spell Storing
 * Run this in the browser console to diagnose issues
 */

// Quick diagnostic function you can run in the console
window.ringQuickTest = function(targetActor = null) {
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

  // 3. Get target character (Priority: provided actor > selected token > assigned character)
  let actor = targetActor;

  if (!actor) {
    // Try selected token first (for GMs)
    const selectedToken = canvas.tokens.controlled[0];
    if (selectedToken?.actor) {
      actor = selectedToken.actor;
      console.log('3. Using selected token:', actor.name);
    } else {
      // Fall back to assigned character
      actor = game.user.character;
      console.log('3. Using assigned character:', actor?.name || 'None');
    }
  } else {
    console.log('3. Using provided actor:', actor.name);
  }

  if (!actor) {
    console.error('❌ No character available! Please:');
    console.error('   - Select a character token on the canvas, OR');
    console.error('   - Set an assigned character, OR');
    console.error('   - Run ringQuickTest(actorObject) with a specific actor');
    console.log('💡 Available characters:');
    game.actors.filter(a => a.type === 'character').forEach((char, i) => {
      console.log(`   ${i}: ${char.name} (ID: ${char.id})`);
    });
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
    const storedSpells = ringData.storedSpells || [];
    console.log(`   Stored spells: ${storedSpells.length}`);
    console.log(`   Equipped: ${ring.system.equipped ? 'Yes' : 'No'}`);
    console.log(`   Attunement: ${ring.system.attunement === 1 ? 'Required' : 'Not required'}`);

    // Check if this character can manage this ring (Priority 1 requirement)
    const canManage = ring.system.equipped && (ring.system.attunement !== 1 || ring.system.attuned);
    console.log(`   ✅ Can manage (Priority 1): ${canManage ? 'YES' : 'NO'}`);

    if (storedSpells.length > 0) {
      console.log(`   Stored spells details:`);
      storedSpells.forEach((spell, si) => {
        console.log(`     ${si + 1}. ${spell.name} (Level ${spell.level}) - Cast by: ${spell.originalCaster?.name || 'Unknown'}`);
      });
    }
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

// Helper function to test with a character by name
window.ringTestByName = function(characterName) {
  const actor = game.actors.getName(characterName);
  if (!actor) {
    console.error(`❌ Character "${characterName}" not found!`);
    console.log('Available characters:');
    game.actors.filter(a => a.type === 'character').forEach(char => {
      console.log(`   - ${char.name}`);
    });
    return false;
  }
  return window.ringQuickTest(actor);
};

// Helper function to test with selected token
window.ringTestSelected = function() {
  const selectedToken = canvas.tokens.controlled[0];
  if (!selectedToken?.actor) {
    console.error('❌ No token selected! Please select a character token on the canvas.');
    return false;
  }
  return window.ringQuickTest(selectedToken.actor);
};

console.log('Ring Quick Test loaded!');
console.log('Available commands:');
console.log('  ringQuickTest() - Auto-detect character (selected token > assigned character)');
console.log('  ringTestSelected() - Test with selected token');
console.log('  ringTestByName("Character Name") - Test with specific character by name');
