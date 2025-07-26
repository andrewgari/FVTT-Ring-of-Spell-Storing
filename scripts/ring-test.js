/**
 * Ring of Spell Storing Test Script
 * Use this in the browser console to test the module functionality
 */

const MODULE_ID = 'ring-of-spell-storing';

/**
 * Test the Ring of Spell Storing module
 */
window.testRingModule = function() {
  console.log('🧪 Testing Ring of Spell Storing Module...\n');

  // Test 1: Check module initialization
  console.log('=== Test 1: Module Initialization ===');
  const module = game.modules.get(MODULE_ID);
  console.log('Module found:', !!module);
  console.log('Module active:', module?.active);
  console.log('Module API available:', !!module?.api);

  if (!module?.active) {
    console.error('❌ Module is not active!');
    return;
  }

  // Test 2: Check settings
  console.log('\n=== Test 2: Settings ===');
  try {
    const showInterface = game.settings.get(MODULE_ID, 'showInterface');
    console.log('Show Interface setting:', showInterface);

    if (!showInterface) {
      console.warn('⚠️ Interface is disabled in settings');
    }
  } catch (error) {
    console.error('❌ Error reading settings:', error);
  }

  // Test 3: Check for character actors
  console.log('\n=== Test 3: Character Actors ===');
  const characters = game.actors.filter(actor => actor.type === 'character');
  console.log(`Found ${characters.length} character actors`);

  if (characters.length === 0) {
    console.warn('⚠️ No character actors found');
    return;
  }

  // Test 4: Check for rings on characters
  console.log('\n=== Test 4: Ring Detection ===');
  let foundRings = false;

  characters.forEach(actor => {
    console.log(`\nChecking ${actor.name}:`);

    // Check all items
    const allItems = actor.items.contents;
    console.log(`  Total items: ${allItems.length}`);

    // Check equipment
    const equipment = allItems.filter(item => item.type === 'equipment');
    console.log(`  Equipment items: ${equipment.length}`);

    // Check for ring-like items
    const ringLike = allItems.filter(item =>
      item.name.toLowerCase().includes('ring') ||
      item.name.toLowerCase().includes('spell storing')
    );
    console.log(`  Ring-like items: ${ringLike.length}`);

    ringLike.forEach(item => {
      console.log(`    - ${item.name} (type: ${item.type}, equipped: ${item.system.equipped})`);
      if (item.system.equipped) {
        foundRings = true;
      }
    });

    // Test the module's ring detection
    if (module?.api?.findRingsOnActor) {
      const moduleRings = module.api.findRingsOnActor(actor);
      console.log(`  Module found rings: ${moduleRings.length}`);
    }
  });

  if (!foundRings) {
    console.warn('⚠️ No equipped rings found on any character');
  }

  // Test 5: Check hooks
  console.log('\n=== Test 5: Hook Registration ===');
  const hooks = Hooks._hooks;
  const relevantHooks = [
    'renderActorSheet',
    'renderActorSheet5eCharacter',
    'renderActorSheet5eCharacter2',
    'ready'
  ];

  relevantHooks.forEach(hookName => {
    const hookCallbacks = hooks[hookName] || [];
    console.log(`${hookName}: ${hookCallbacks.length} callbacks`);

    const ourCallback = hookCallbacks.find(callback =>
      callback.fn.toString().includes('ring-of-spell-storing') ||
      callback.fn.toString().includes('RingOfSpellStoring')
    );
    console.log(`  Our callback found: ${!!ourCallback}`);
  });

  console.log('\n🧪 Test complete!');
};

/**
 * Force trigger the ring interface on a specific actor
 */
window.forceRingInterface = function(actorName) {
  const actor = game.actors.getName(actorName);
  if (!actor) {
    console.error(`Actor "${actorName}" not found`);
    return;
  }

  console.log(`🔧 Force triggering ring interface for ${actor.name}`);

  const module = game.modules.get(MODULE_ID);
  if (!module?.api) {
    console.error('Module API not available');
    return;
  }

  // Check for rings
  const rings = module.api.findRingsOnActor(actor);
  console.log(`Found ${rings.length} rings`);

  if (rings.length === 0) {
    console.warn('No rings found on actor');
    return;
  }

  // Try to trigger the sheet rendering
  if (actor.sheet && actor.sheet.rendered) {
    console.log('Re-rendering actor sheet...');
    actor.sheet.render(false);
  } else {
    console.log('Opening actor sheet...');
    actor.sheet.render(true);
  }
};

/**
 * Create a test ring item
 */
window.createTestRing = async function(actorName) {
  const actor = game.actors.getName(actorName);
  if (!actor) {
    console.error(`Actor "${actorName}" not found`);
    return;
  }

  console.log(`🔧 Creating test ring for ${actor.name}`);

  const ringData = {
    name: 'Ring of Spell Storing',
    type: 'equipment',
    system: {
      equipped: true,
      attunement: 1, // Requires attunement
      rarity: 'rare',
      description: {
        value: 'This ring stores spells cast into it, holding them until the attuned wearer uses them.'
      },
      flags: {
        [MODULE_ID]: {
          storedSpells: []
        }
      }
    }
  };

  try {
    const item = await actor.createEmbeddedDocuments('Item', [ringData]);
    console.log('✅ Test ring created:', item[0].name);

    // Re-render the sheet
    if (actor.sheet && actor.sheet.rendered) {
      actor.sheet.render(false);
    }

    return item[0];
  } catch (error) {
    console.error('❌ Error creating test ring:', error);
  }
};

console.log('🧪 Ring test functions loaded. Use:');
console.log('  testRingModule() - Run full diagnostic');
console.log('  forceRingInterface("Actor Name") - Force trigger interface');
console.log('  createTestRing("Actor Name") - Create test ring');
