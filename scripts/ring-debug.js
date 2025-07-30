/**
 * Ring of Spell Storing Debug Script
 * Use this to test and diagnose issues with the module
 */

// Debug function to test if the module is working
window.debugRingModule = function() {
  console.log('=== Ring of Spell Storing Debug ===');

  // Check if module is loaded
  const module = game.modules.get('ring-of-spell-storing');
  console.log('Module found:', !!module);
  console.log('Module active:', module?.active);

  // Check if API is available
  console.log('API available:', !!window.RingOfSpellStoringAPI);

  // Check for selected token/actor
  const selectedTokens = canvas.tokens.controlled;
  console.log('Selected tokens:', selectedTokens.length);

  if (selectedTokens.length > 0) {
    const actor = selectedTokens[0].actor;
    console.log('Selected actor:', actor.name);

    // Check for rings
    const rings = actor.items.filter(item =>
      item.type === 'equipment' &&
      item.name.toLowerCase().includes('ring of spell storing')
    );
    console.log('Rings found:', rings.length);

    rings.forEach((ring, index) => {
      console.log(`Ring ${index + 1}:`, ring.name);
      console.log('Ring flags:', ring.system.flags);
      console.log('Ring stored spells:', ring.system.flags?.['ring-of-spell-storing']?.storedSpells);
    });

    // Try to open interface for first ring
    if (rings.length > 0) {
      console.log('Attempting to open ring interface...');
      try {
        if (window.RingOfSpellStoringAPI?.openRingInterface) {
          window.RingOfSpellStoringAPI.openRingInterface(actor, rings[0]);
        } else {
          console.error('openRingInterface not available in API');
        }
      } catch (error) {
        console.error('Error opening ring interface:', error);
      }
    }
  } else {
    console.log('No token selected. Please select a token with a Ring of Spell Storing.');
  }

  console.log('=== Debug Complete ===');
};

// Function to manually add a ring to selected actor for testing
window.addTestRing = async function() {
  const selectedTokens = canvas.tokens.controlled;
  if (selectedTokens.length === 0) {
    ui.notifications.warn('Please select a token first');
    return;
  }

  const actor = selectedTokens[0].actor;

  // Create a Ring of Spell Storing item
  const ringData = {
    name: 'Ring of Spell Storing',
    type: 'equipment',
    system: {
      description: {
        value: 'A magical ring that can store spells for later use.'
      },
      equipped: true,
      rarity: 'rare',
      flags: {
        'ring-of-spell-storing': {
          storedSpells: []
        }
      }
    }
  };

  try {
    const createdItem = await actor.createEmbeddedDocuments('Item', [ringData]);
    ui.notifications.info(`Added Ring of Spell Storing to ${actor.name}`);
    console.log('Created ring:', createdItem[0]);
  } catch (error) {
    console.error('Error creating ring:', error);
    ui.notifications.error('Failed to create ring');
  }
};

// Function to test storing a spell
window.testStoreSpell = async function() {
  const selectedTokens = canvas.tokens.controlled;
  if (selectedTokens.length === 0) {
    ui.notifications.warn('Please select a token first');
    return;
  }

  const actor = selectedTokens[0].actor;
  const rings = actor.items.filter(item =>
    item.type === 'equipment' &&
    item.name.toLowerCase().includes('ring of spell storing')
  );

  if (rings.length === 0) {
    ui.notifications.warn('No Ring of Spell Storing found on selected actor');
    return;
  }

  const ring = rings[0];

  // Test spell data
  const testSpell = {
    name: 'Magic Missile',
    level: 1,
    originalCaster: {
      name: actor.name,
      spellAttack: 5,
      saveDC: 13,
      level: 3
    },
    spellData: {
      description: 'Test spell for debugging'
    }
  };

  try {
    // Get current stored spells
    const currentSpells = ring.system.flags?.['ring-of-spell-storing']?.storedSpells || [];
    const newSpells = [...currentSpells, testSpell];

    // Update the ring
    await ring.update({
      'system.flags.ring-of-spell-storing.storedSpells': newSpells
    });

    ui.notifications.info('Test spell stored successfully!');
    console.log('Updated ring with test spell:', newSpells);
  } catch (error) {
    console.error('Error storing test spell:', error);
    ui.notifications.error('Failed to store test spell');
  }
};

console.log('Ring debug functions loaded:');
console.log('- debugRingModule() - Check module status and find rings');
console.log('- addTestRing() - Add a test ring to selected actor');
console.log('- testStoreSpell() - Store a test spell in ring');
