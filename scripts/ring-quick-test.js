/**
 * Quick Test Script for Ring of Spell Storing
 * Run this in the browser console to diagnose issues
 */

// Enhanced character detection function
function detectCharacter(verbose = true) {
  if (verbose) {
    console.log('🔍 Detecting character using multiple methods...');
  }

  const methods = [];
  let actor = null;

  // Method 1: Selected token (highest priority for active gameplay)
  const selectedTokens = canvas.tokens?.controlled || [];
  if (selectedTokens.length > 0 && selectedTokens[0].actor) {
    methods.push(`✅ Selected token: ${selectedTokens[0].actor.name}`);
    actor = actor || selectedTokens[0].actor;
  } else {
    methods.push('❌ No token selected');
  }

  // Method 2: Assigned character
  if (game.user.character) {
    methods.push(`✅ Assigned character: ${game.user.character.name}`);
    actor = actor || game.user.character;
  } else {
    methods.push('❌ No assigned character');
  }

  // Method 3: Open character sheet
  const openSheets = Object.values(ui.windows).filter(w =>
    w.constructor.name.includes('ActorSheet') && w.actor?.type === 'character'
  );
  if (openSheets.length > 0) {
    methods.push(`✅ Open character sheet: ${openSheets[0].actor.name}`);
    actor = actor || openSheets[0].actor;
  } else {
    methods.push('❌ No character sheet open');
  }

  // Method 4: First owned character (fallback)
  const ownedCharacters = game.actors.filter(a =>
    a.type === 'character' && a.isOwner
  );
  if (ownedCharacters.length > 0) {
    methods.push(`✅ First owned character: ${ownedCharacters[0].name}`);
    actor = actor || ownedCharacters[0];
  } else {
    methods.push('❌ No owned characters');
  }

  // Log all detection methods if verbose
  if (verbose) {
    methods.forEach(method => console.log(`   ${method}`));

    if (actor) {
      console.log(`🎯 Using character: ${actor.name} (ID: ${actor.id})`);
    } else {
      console.log('❌ No character could be detected by any method');
      console.log('💡 Try one of these solutions:');
      console.log('   • Select a character token on the canvas');
      console.log('   • Open a character sheet');
      console.log('   • Set a default character in your user settings');
      console.log('   • Run: ringTestByName("Your Character Name")');
    }
  }

  return actor;
}

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

  // 3. Detect character using enhanced logic
  const actor = targetActor || detectCharacter();
  console.log('3. Character detection result:', actor?.name || 'Failed');

  if (!actor) {
    console.error('❌ No character could be detected!');
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
  const targetActor = actor || detectCharacter();
  if (!targetActor) {
    console.error('❌ No character available for diagnostics');
    return false;
  }

  const module = game.modules.get('ring-of-spell-storing');
  if (module?.api?.runDiagnostics) {
    return module.api.runDiagnostics(targetActor);
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

  // Use enhanced character detection
  const actor = detectCharacter();
  if (!actor) {
    console.error('❌ No character could be detected!');
    return false;
  }

  const module = game.modules.get('ring-of-spell-storing');
  if (!module?.active) {
    console.error('❌ Module not active! Enable it in module settings.');
    return false;
  }

  console.log(`🎯 Testing with character: ${actor.name}`);

  // Check if character has rings
  const rings = module.api?.findRingsOnActor?.(actor) || [];
  console.log(`🔍 Found ${rings.length} rings on ${actor.name}`);

  if (rings.length === 0) {
    console.warn('⚠️ No rings found on this character.');
    console.log('💡 Make sure you have a "Ring of Spell Storing" item that is equipped and attuned.');
    return false;
  }

  // Force re-render the character sheet
  if (actor.sheet.rendered) {
    console.log('🔄 Re-rendering character sheet...');
    actor.sheet.render(false);

    setTimeout(() => {
      console.log('✅ Sheet re-rendered! Check your Spells tab for ring sections.');
      console.log('📋 You should see:');
      rings.forEach((ring, i) => {
        console.log(`   • Ring ${i + 1}: ${ring.name} with "Manage" button`);
      });
      console.log('❓ If you still don\'t see anything, run ringQuickTest() for full diagnostics.');
    }, 500);
  } else {
    console.log('📖 Opening character sheet...');
    actor.sheet.render(true);

    setTimeout(() => {
      console.log('✅ Character sheet opened! Check your Spells tab for ring sections.');
    }, 500);
  }

  return true;
};

// Test all item sheet hooks to see what's actually firing
window.testAllItemHooks = function() {
  console.log('=== TESTING ALL ITEM SHEET HOOKS ===');

  const actor = detectCharacter(false);
  if (!actor) {
    console.error('❌ No character detected');
    return false;
  }

  const api = game.modules.get('ring-of-spell-storing')?.api;
  if (!api) {
    console.error('❌ Module API not available');
    return false;
  }

  const rings = api.findRingsOnActor(actor);
  if (rings.length === 0) {
    console.error('❌ No rings found');
    return false;
  }

  const ring = rings[0];
  console.log(`🔍 Testing with ring: ${ring.name} (ID: ${ring.id})`);

  // Monitor ALL possible item sheet hooks
  const hookNames = [
    'renderItemSheet',
    'renderItemSheet5e',
    'renderDnd5eItemSheet',
    'renderApplication',
    'renderDocumentSheet'
  ];

  const hookIds = [];

  hookNames.forEach(hookName => {
    const hookId = Hooks.on(hookName, (sheet, html, _data) => {
      if (sheet.document?.id === ring.id || sheet.item?.id === ring.id) {
        console.log(`🎯 HOOK FIRED: ${hookName}`);
        console.log('   Sheet type:', sheet.constructor.name);
        console.log('   Sheet ID:', sheet.id);
        console.log('   Item ID:', sheet.document?.id || sheet.item?.id);
        console.log('   Item name:', sheet.document?.name || sheet.item?.name);
        console.log('   HTML length:', html?.length || 'No HTML');
      }
    });
    hookIds.push({ name: hookName, id: hookId });
  });

  console.log(`📡 Monitoring ${hookNames.length} hooks...`);
  console.log('🔄 Opening ring item sheet...');

  ring.sheet.render(true);

  // Clean up hooks after 10 seconds
  setTimeout(() => {
    hookIds.forEach(({ name, id }) => {
      Hooks.off(name, id);
    });
    console.log('⏰ Hook monitoring completed');
  }, 10000);

  return true;
};

// Test item sheet hook specifically
window.testItemSheetHook = function() {
  console.log('=== TESTING ITEM SHEET HOOK ===');

  const actor = detectCharacter(false);
  if (!actor) {
    console.error('❌ No character detected');
    return false;
  }

  const api = game.modules.get('ring-of-spell-storing')?.api;
  if (!api) {
    console.error('❌ Module API not available');
    return false;
  }

  const rings = api.findRingsOnActor(actor);
  if (rings.length === 0) {
    console.error('❌ No rings found');
    return false;
  }

  const ring = rings[0];
  console.log(`🔍 Testing with ring: ${ring.name}`);

  // Add a temporary hook to see if it fires
  const hookId = Hooks.on('renderItemSheet', (sheet, html, _data) => {
    if (sheet.item.id === ring.id) {
      console.log('🎯 ITEM SHEET HOOK FIRED!');
      console.log('   Sheet type:', sheet.constructor.name);
      console.log('   HTML length:', html.length);
      console.log('   Ring name:', sheet.item.name);

      // Test if our method gets called
      const module = game.modules.get('ring-of-spell-storing');
      if (module.api.isRingOfSpellStoring(sheet.item)) {
        console.log('✅ Ring recognized by module');

        // Try to manually add the interface
        module.api.addSpellManagementToItemSheet(html, sheet.item).then(() => {
          console.log('✅ Manual interface injection completed');
        }).catch(error => {
          console.error('❌ Manual interface injection failed:', error);
        });
      } else {
        console.log('❌ Ring NOT recognized by module');
      }

      // Remove the temporary hook
      Hooks.off('renderItemSheet', hookId);
    }
  });

  console.log('🔄 Opening ring item sheet...');
  ring.sheet.render(true);

  // Clean up hook after 5 seconds if it doesn't fire
  setTimeout(() => {
    Hooks.off('renderItemSheet', hookId);
    console.log('⏰ Hook cleanup completed');
  }, 5000);

  return true;
};

// Check what hooks are actually registered
window.checkHookRegistration = function() {
  console.log('=== CHECKING HOOK REGISTRATION ===');

  const hookNames = [
    'renderItemSheet',
    'renderItemSheet5e',
    'renderDnd5eItemSheet',
    'renderActorSheet',
    'renderApplication'
  ];

  hookNames.forEach(hookName => {
    const hooks = Hooks._hooks[hookName] || [];
    const ringHooks = hooks.filter(hook =>
      hook.fn.toString().includes('ring-of-spell-storing') ||
      hook.fn.toString().includes('onRenderItemSheet') ||
      hook.fn.toString().includes('onRenderActorSheet')
    );
    console.log(`${hookName}: ${hooks.length} total hooks, ${ringHooks.length} ring-related`);

    if (ringHooks.length > 0) {
      ringHooks.forEach((hook, i) => {
        console.log(`   Ring hook ${i + 1}: ${hook.fn.name || 'anonymous'}`);
      });
    }
  });

  // Also check if the module's hooks are properly bound
  const module = game.modules.get('ring-of-spell-storing');
  console.log('Module active:', module?.active);
  console.log('Module API available:', !!module?.api);

  return true;
};

// Test the new context menu system
window.testContextMenu = function() {
  console.log('=== TESTING CONTEXT MENU SYSTEM ===');

  const actor = detectCharacter(false);
  if (!actor) {
    console.error('❌ No character detected');
    return false;
  }

  const api = game.modules.get('ring-of-spell-storing')?.api;
  if (!api) {
    console.error('❌ Module API not available');
    return false;
  }

  const rings = api.findRingsOnActor(actor);
  if (rings.length === 0) {
    console.error('❌ No rings found');
    return false;
  }

  const ring = rings[0];
  console.log(`🔍 Testing context menu with ring: ${ring.name}`);

  // Test the context menu methods directly
  console.log('📋 Testing showRingContents...');
  api.showRingContents(ring);

  setTimeout(() => {
    console.log('🔮 Testing openRingManagementDialog...');
    api.openRingManagementDialog(ring);
  }, 2000);

  setTimeout(() => {
    console.log('📥 Testing openStoreSpellDialog...');
    api.openStoreSpellDialog(ring);
  }, 4000);

  console.log('✅ Context menu test initiated!');
  console.log('   - Ring contents dialog should open immediately');
  console.log('   - Management dialog should open in 2 seconds');
  console.log('   - Store spell dialog should open in 4 seconds');

  return true;
};

console.log('🔧 Ring of Spell Storing Diagnostics Loaded!');
console.log('📋 Available commands:');
console.log('  🚀 testRingFix() - Quick test after applying the fix (enhanced character detection)');
console.log('  🔍 ringQuickTest() - Full diagnostic with auto-detect character');
console.log('  🎯 ringTestSelected() - Test with selected token');
console.log('  📝 ringTestByName("Character Name") - Test with specific character by name');
console.log('  🛠️  ringDiagnostics() - Advanced diagnostics');
console.log('  🔧 testItemSheetHook() - Test if item sheet hook is working');
console.log('  📡 testAllItemHooks() - Monitor all item sheet hooks');
console.log('  🔍 checkHookRegistration() - Check what hooks are registered');
console.log('  🎯 testContextMenu() - Test the new context menu system');
console.log('');
console.log('💡 Character Detection Priority:');
console.log('  1. Selected token on canvas (highest priority)');
console.log('  2. Assigned character in user settings');
console.log('  3. Open character sheet');
console.log('  4. First owned character (fallback)');
