/**
 * Quick Test Script for Ring of Spell Storing
 * Run this in the browser console to diagnose issues
 */

// Quick diagnostic function you can run in the console
window.ringQuickTest = function(targetActor = null) {
  console.log('=== RING OF SPELL STORING QUICK TEST (ITEM-CENTRIC) ===');

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

  // 6. Test item-centric approach
  console.log('6. Testing item-centric approach...');

  const ring = rings[0]; // Test with first ring
  console.log(`   Testing with ring: ${ring.name} (ID: ${ring.id})`);

  // Check if ring is recognized
  const isRing = api.isRingOfSpellStoring(ring);
  console.log(`   Ring recognized: ${isRing}`);

  if (!isRing) {
    console.error('❌ Ring not recognized by isRingOfSpellStoring method!');
    return false;
  }

  // 7. Test opening ring item sheet
  console.log('7. Testing ring item sheet...');

  if (ring.sheet && ring.sheet.rendered) {
    console.log('✅ Ring item sheet is already open');
    console.log('   Check the ring item sheet for the spell management interface!');
  } else {
    console.log('⚠️ Ring item sheet not open. Opening it now...');
    try {
      ring.sheet.render(true);
      console.log('✅ Ring item sheet opened - check for spell management interface!');
    } catch (error) {
      console.error('❌ Failed to open ring item sheet:', error);
      return false;
    }
  }

  // 8. Instructions for user
  console.log('8. Next steps...');
  console.log('   📝 To test the new item-centric interface:');
  console.log('   1. Right-click the Ring of Spell Storing in your inventory');
  console.log('   2. Select "Edit" or double-click the ring');
  console.log('   3. Look for the "Spell Storage Management" section');
  console.log('   4. Use the buttons to store, cast, or manage spells');
  console.log('');
  console.log('   🎯 This new approach eliminates character sheet compatibility issues!');
  console.log('   🎯 The ring is now a self-contained magical item!');

  console.log('=== TEST COMPLETE ===');
  console.log('✅ If you see the spell management interface in the ring item sheet, the module is working!');
  console.log('⚠️ If not, check the console errors above for specific issues.');
  console.log('');
  console.log('🔄 The module has been redesigned to be item-centric rather than character sheet-centric.');
  console.log('📋 This should resolve all character sheet compatibility issues!');

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

// Quick fix test - run this after the module fix
window.testRingFix = function() {
  console.log('=== TESTING RING FIX ===');

  const actor = game.user.character;
  if (!actor) {
    console.error('No character selected');
    return false;
  }

  const module = game.modules.get('ring-of-spell-storing');
  if (!module?.active) {
    console.error('Module not active');
    return false;
  }

  // Force re-render the character sheet
  if (actor.sheet.rendered) {
    console.log('Re-rendering character sheet...');
    actor.sheet.render(false);

    setTimeout(() => {
      console.log('✅ Sheet re-rendered! Check your Spells tab for ring sections.');
      console.log('If you still don\'t see anything, run ringQuickTest() for full diagnostics.');
    }, 500);
  } else {
    console.log('Opening character sheet...');
    actor.sheet.render(true);
  }

  return true;
};

console.log('Ring Quick Test loaded!');
console.log('Available commands:');
console.log('  testRingFix() - Quick test after applying the fix');
console.log('  ringQuickTest() - Auto-detect character (selected token > assigned character)');
console.log('  ringTestSelected() - Test with selected token');
console.log('  ringTestByName("Character Name") - Test with specific character by name');
