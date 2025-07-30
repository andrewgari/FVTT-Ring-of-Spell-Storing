/**
 * Debug test for Ring of Spell Storing module
 * Run this in the browser console to diagnose issues
 */

console.log('=== Ring of Spell Storing Debug Test ===');

// Check if Foundry is loaded
if (typeof game === 'undefined') {
  console.error('Foundry VTT not loaded - run this in the Foundry browser console');
} else {
  console.log('✓ Foundry VTT detected');

  // Check module status
  const module = game.modules.get('ring-of-spell-storing');
  console.log('Module found:', !!module);
  console.log('Module active:', module?.active);
  console.log('Module data:', module?.data);

  if (module?.active) {
    console.log('✓ Module is active');

    // Check API
    console.log('API available:', !!module.api);
    if (module.api) {
      console.log('API methods:', Object.keys(module.api));
    }

    // Check if we can find any actors
    const actors = game.actors.contents;
    console.log('Total actors:', actors.length);

    const characters = actors.filter(a => a.type === 'character');
    console.log('Character actors:', characters.length);

    if (characters.length > 0) {
      const testActor = characters[0];
      console.log('Testing with actor:', testActor.name);

      // Check for rings
      const rings = testActor.items.filter(item =>
        item.type === 'equipment' &&
        (item.name.toLowerCase().includes('ring') ||
         item.name.toLowerCase().includes('spell storing'))
      );

      console.log('Ring-like items found:', rings.length);
      rings.forEach(ring => {
        console.log(`- ${ring.name} (equipped: ${ring.system.equipped})`);
      });

      // Test API methods if available
      if (module.api) {
        try {
          const foundRings = module.api.findRingsOnActor(testActor);
          console.log('API findRingsOnActor result:', foundRings.length);
        } catch (error) {
          console.error('Error calling API method:', error);
        }
      }
    }

  } else {
    console.error('✗ Module is not active');
  }

  // Check for common issues
  console.log('\n=== Common Issues Check ===');

  // Check D&D 5e system
  const dnd5e = game.system.id === 'dnd5e';
  console.log('D&D 5e system:', dnd5e);

  // Check Foundry version
  console.log('Foundry version:', game.version);

  // Check for conflicting modules
  const activeModules = Array.from(game.modules.entries())
    .filter(([_id, mod]) => mod.active)
    .map(([id, _mod]) => id);

  console.log('Active modules:', activeModules.length);

  // Look for potential conflicts
  const potentialConflicts = activeModules.filter(id =>
    id.includes('spell') ||
    id.includes('magic') ||
    id.includes('item') ||
    id.includes('sheet')
  );

  if (potentialConflicts.length > 0) {
    console.log('Potential conflicting modules:', potentialConflicts);
  }
}

console.log('=== Debug Test Complete ===');
