/**
 * Simple Ring of Spell Storing Test Script
 * Run this in the Foundry console to test basic functionality
 */

// Test function to be called from console
window.testRingModule = function() {
  console.log('=== Ring of Spell Storing Simple Test ===');

  try {
    // Check if module is loaded
    const module = game.modules.get('ring-of-spell-storing');
    if (!module) {
      console.error('❌ Module not found');
      return false;
    }

    if (!module.active) {
      console.error('❌ Module not active');
      return false;
    }

    console.log('✅ Module is active');

    // Check API
    if (!module.api) {
      console.error('❌ Module API not available');
      return false;
    }

    console.log('✅ Module API available');
    console.log('Available API methods:', Object.keys(module.api));

    // Test with selected token
    const selectedTokens = canvas.tokens.controlled;
    if (selectedTokens.length === 0) {
      console.warn('⚠️ No token selected. Please select a character token and run again.');
      return false;
    }

    const actor = selectedTokens[0].actor;
    console.log('Testing with actor:', actor.name);

    // Test ring detection
    const rings = module.api.findRingsOnActor(actor);
    console.log('Rings found:', rings.length);

    if (rings.length === 0) {
      console.log('No rings found. Checking all equipment items:');
      const equipment = actor.items.filter(i => i.type === 'equipment');
      equipment.forEach(item => {
        console.log(`- ${item.name} (equipped: ${item.system.equipped})`);
      });

      console.log('\nTo test, create an equipment item named "Ring of Spell Storing" and equip it.');
      return false;
    }

    // Test with first ring
    const ring = rings[0];
    console.log('Testing with ring:', ring.name);

    // Test ring data access
    const ringData = module.api.getRingSpellData(ring);
    console.log('Ring spell data:', ringData);

    const usedLevels = module.api.calculateUsedLevels(ring);
    console.log('Used spell levels:', usedLevels);

    const hasCapacity = module.api.hasCapacity(ring, 1);
    console.log('Has capacity for level 1 spell:', hasCapacity);

    // Test opening interface
    console.log('Opening ring interface...');
    module.api.openRingInterface(actor, ring);

    console.log('✅ All tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
};

// Auto-run test if module is ready
if (typeof game !== 'undefined' && game.ready) {
  console.log('Ring test script loaded. Run testRingModule() in console to test.');
} else {
  console.log('Waiting for Foundry to be ready...');
}
