/**
 * Test file for Ring of Spell Storing fixes
 * Tests both UI display and spell level validation issues
 */

// Mock Foundry VTT environment for testing
const mockFoundryEnvironment = () => {
  global.game = {
    i18n: {
      localize: (key) => key,
      format: (key, data) => `${key}: ${JSON.stringify(data)}`
    },
    settings: {
      get: (module, setting) => {
        if (setting === 'allowSelfSpells') {
          return true;
        }
        return true;
      }
    },
    actors: {
      filter: () => []
    },
    items: {
      get: () => null
    },
    user: {
      isGM: false
    },
    packs: {
      get: () => null
    }
  };

  global.ui = {
    notifications: {
      info: (msg) => console.log('INFO:', msg),
      warn: (msg) => console.log('WARN:', msg),
      error: (msg) => console.log('ERROR:', msg)
    }
  };

  global.foundry = {
    utils: {
      duplicate: (obj) => JSON.parse(JSON.stringify(obj)),
      mergeObject: (original, other) => ({ ...original, ...other })
    }
  };

  global.CONFIG = {
    Item: {
      documentClass: class MockItem {
        constructor(data, options) {
          this.data = data;
          this.options = options;
        }
      }
    }
  };

  global.Application = class MockApplication {
    constructor(options) {
      this.options = options;
    }
    static get defaultOptions() {
      return {};
    }
    render() {}
    close() {}
  };

  global.Dialog = class MockDialog {
    constructor(options) {
      this.options = options;
    }
    render() {}
    static confirm() {
      return Promise.resolve(true);
    }
  };
};

// Test data
const createMockActor = (name, spells = [], spellSlots = {}) => ({
  id: `actor-${name}`,
  name: name,
  isOwner: true,
  items: {
    filter: (fn) => spells.filter(fn),
    get: (id) => spells.find(s => s.id === id)
  },
  system: {
    spells: {
      spell1: spellSlots.spell1 || { max: 2, value: 2 },
      spell2: spellSlots.spell2 || { max: 1, value: 1 },
      spell3: spellSlots.spell3 || { max: 1, value: 1 },
      pact: spellSlots.pact || null
    },
    attributes: {
      spellcasting: {
        attack: 5,
        dc: 13
      }
    }
  },
  update: async(data) => {
    console.log(`Updating actor ${name}:`, data);
    return true;
  },
  updateEmbeddedDocuments: async(type, updates) => {
    console.log(`Updating embedded ${type} for ${name}:`, updates);
    return updates;
  }
});

const createMockSpell = (name, level) => ({
  id: `spell-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name: name,
  type: 'spell',
  system: {
    level: level,
    target: { type: 'creature' }
  }
});

const createMockRing = (actorId, storedSpells = []) => ({
  id: 'ring-of-spell-storing',
  name: 'Ring of Spell Storing',
  type: 'equipment',
  parent: { id: actorId },
  system: {
    equipped: true,
    flags: {
      'ring-of-spell-storing': {
        storedSpells: storedSpells
      }
    }
  },
  update: async(data) => {
    console.log('Updating ring:', data);
    // Simulate the update
    if (data['system.flags.ring-of-spell-storing']) {
      this.system.flags['ring-of-spell-storing'] = data['system.flags.ring-of-spell-storing'];
    }
    return true;
  }
});

// Test functions
const testSpellLevelValidation = () => {
  console.log('\n=== Testing Spell Level Validation ===');

  mockFoundryEnvironment();

  // Import the RingInterface class
  const { RingInterface } = require('../scripts/ring-interface.js');

  const actor = createMockActor('Test Wizard', [
    createMockSpell('Shield', 1),
    createMockSpell('Misty Step', 2),
    createMockSpell('Fireball', 3)
  ]);

  const ring = createMockRing(actor.id);
  const ringInterface = new RingInterface(actor, ring);

  // Test 1: Valid spell levels
  console.log('Test 1: Getting valid levels for Shield (1st level spell)');
  const shieldLevels = ringInterface.getValidSpellLevelsArray(actor.items.filter(s => s.name === 'Shield')[0], actor);
  console.log('Shield valid levels:', shieldLevels.map(l => l.level));

  // Test 2: Valid spell levels for higher level spell
  console.log('Test 2: Getting valid levels for Fireball (3rd level spell)');
  const fireballLevels = ringInterface.getValidSpellLevelsArray(actor.items.filter(s => s.name === 'Fireball')[0], actor);
  console.log('Fireball valid levels:', fireballLevels.map(l => l.level));

  // Test 3: Validation function
  console.log('Test 3: Testing validation logic');
  const mockHtml = {
    find: (selector) => ({
      val: () => selector.includes('level-select') ? '1' : '0',
      text: () => {},
      show: () => console.log('Showing validation warning'),
      hide: () => console.log('Hiding validation warning'),
      prop: () => {}
    })
  };

  const fireballEntry = {
    spell: actor.items.filter(s => s.name === 'Fireball')[0],
    minLevel: 3
  };

  ringInterface.validateSpellLevelSelection(mockHtml, fireballEntry);

  console.log('Spell level validation tests completed');
};

const testUIDisplay = () => {
  console.log('\n=== Testing UI Display ===');

  mockFoundryEnvironment();

  const { RingInterface } = require('../scripts/ring-interface.js');

  const storedSpells = [
    {
      id: 'spell-shield',
      name: 'Shield',
      level: 1,
      originalCaster: {
        id: 'wizard-1',
        name: 'Test Wizard',
        spellAttackBonus: 5,
        spellSaveDC: 13
      },
      storedAt: Date.now()
    },
    {
      id: 'spell-misty-step',
      name: 'Misty Step',
      level: 2,
      originalCaster: {
        id: 'wizard-1',
        name: 'Test Wizard',
        spellAttackBonus: 5,
        spellSaveDC: 13
      },
      storedAt: Date.now()
    }
  ];

  const actor = createMockActor('Test Wizard');
  const ring = createMockRing(actor.id, storedSpells);
  const ringInterface = new RingInterface(actor, ring);

  console.log('Test 1: Getting template data');
  const templateData = ringInterface.getData();

  console.log('Stored spells count:', templateData.storedSpells.length);
  console.log('Used levels:', templateData.usedLevels);
  console.log('Remaining levels:', templateData.remainingLevels);
  console.log('Capacity percentage:', templateData.capacityPercentage);

  // Verify the spells are properly displayed
  if (templateData.storedSpells.length === 2) {
    console.log('✅ UI Display Test PASSED: Correct number of spells displayed');
  } else {
    console.log('❌ UI Display Test FAILED: Expected 2 spells, got', templateData.storedSpells.length);
  }

  if (templateData.usedLevels === 3) {
    console.log('✅ Capacity Calculation Test PASSED: Correct used levels');
  } else {
    console.log('❌ Capacity Calculation Test FAILED: Expected 3 used levels, got', templateData.usedLevels);
  }

  console.log('UI display tests completed');
};

// Run tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testSpellLevelValidation,
    testUIDisplay,
    createMockActor,
    createMockSpell,
    createMockRing
  };
} else {
  // Run tests if executed directly
  testSpellLevelValidation();
  testUIDisplay();
}
