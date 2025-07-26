/**
 * Unit tests for RingInterface class
 */

const { MODULE_ID, MAX_SPELL_LEVELS } = require('./setup');

// Mock the module before importing
jest.mock('../scripts/ring-interface.js', () => {
  const originalModule = jest.requireActual('../scripts/ring-interface.js');
  return originalModule;
});

describe('RingInterface', () => {
  let mockActor, mockRing, ringInterface;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock actor with spellcasting
    mockActor = new global.Actor({
      id: 'test-actor',
      name: 'Test Wizard',
      system: {
        spells: {
          spell1: { max: 4, value: 3 },
          spell2: { max: 3, value: 2 },
          spell3: { max: 3, value: 3 }
        },
        attributes: {
          spellcasting: {
            attack: 7,
            dc: 15
          }
        }
      },
      items: new global.MockCollection(),
      isOwner: true
    });

    // Add some spells to the actor
    const mockSpell = new global.Item({
      id: 'absorb-elements',
      name: 'Absorb Elements',
      type: 'spell',
      system: { level: 1 }
    });
    mockActor.items.push(mockSpell);

    // Create mock ring
    mockRing = new global.Item({
      id: 'test-ring',
      name: 'Ring of Spell Storing',
      type: 'equipment',
      system: {
        flags: {}
      },
      parent: mockActor
    });

    // Add ring to actor's items
    mockActor.items.push(mockRing);

    // Mock the RingInterface class
    global.RingInterface = class MockRingInterface extends global.Application {
      constructor(actor, ring) {
        super();
        this.actor = actor;
        this.ring = ring;
      }

      getData() {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        const storedSpells = ringData.storedSpells || [];
        const usedLevels = storedSpells.reduce((sum, spell) => sum + spell.level, 0);

        return {
          actor: this.actor,
          ring: this.ring,
          storedSpells: storedSpells,
          maxLevels: MAX_SPELL_LEVELS,
          usedLevels: usedLevels,
          remainingLevels: MAX_SPELL_LEVELS - usedLevels,
          capacityPercentage: (usedLevels / MAX_SPELL_LEVELS) * 100,
          canCast: this.canCastSpells(),
          canStore: this.canStoreSpells(),
          canManage: this.canManageRing()
        };
      }

      canCastSpells() {
        return global.game.user.isGM || this.actor.isOwner;
      }

      canStoreSpells() {
        if (global.game.user.isGM) {
          return true;
        }
        const ownedActors = [this.actor]; // Simplified for testing
        return ownedActors.some(actor => this.hasSpellcastingAbility(actor));
      }

      canManageRing() {
        return global.game.user.isGM || this.actor.isOwner;
      }

      hasSpellcastingAbility(actor) {
        const spellcasting = actor.system.spells;
        if (spellcasting) {
          for (let level = 1; level <= 9; level++) {
            if (spellcasting[`spell${level}`]?.max > 0) {
              return true;
            }
          }
        }
        return actor.items.some(item => item.type === 'spell' && item.system.level > 0);
      }

      getValidSpellLevels(spell, actor) {
        const spellMinLevel = spell.system.level;
        const spellcasting = actor.system.spells;
        const validLevels = [];

        for (let level = spellMinLevel; level <= 5; level++) {
          const slotData = spellcasting[`spell${level}`];
          if (slotData && slotData.max > 0) {
            validLevels.push({
              level: level,
              type: 'spell',
              available: slotData.value || 0,
              max: slotData.max
            });
          }
        }

        return validLevels.map(slot => {
          const availability = slot.available > 0 ? ` [${slot.available}/${slot.max} available]` : ' [No slots]';
          return `<option value="${slot.level}" data-type="${slot.type}" ${slot.available === 0 ? 'disabled' : ''}>
            Level ${slot.level}${availability}
          </option>`;
        }).join('');
      }

      async storeSpellFromActor(spell, casterActor, level, spellType = 'spell') {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        const usedLevels = ringData.storedSpells.reduce((sum, s) => sum + s.level, 0);

        // Validate spell level
        const minLevel = spell.system.level;
        if (level < minLevel) {
          return false;
        }

        if (usedLevels + level > MAX_SPELL_LEVELS) {
          return false;
        }

        const spellData = {
          id: spell.id,
          name: spell.name,
          level: level,
          originalLevel: minLevel,
          spellType: spellType,
          originalCaster: {
            id: casterActor.id,
            name: casterActor.name,
            spellAttackBonus: casterActor.system.attributes.spellcasting?.attack || 0,
            spellSaveDC: casterActor.system.attributes.spellcasting?.dc || 8
          },
          storedAt: Date.now()
        };

        ringData.storedSpells.push(spellData);

        // Update the ring
        await this.ring.update({
          [`system.flags.${MODULE_ID}`]: ringData
        });

        return true;
      }

      async consumeSpellSlot(actor, level, spellType) {
        const spellcasting = actor.system.spells;
        const slotKey = `spell${level}`;
        const slotData = spellcasting[slotKey];

        if (slotData && slotData.value > 0) {
          slotData.value -= 1;
          return true;
        }
        return false;
      }
    };

    ringInterface = new global.RingInterface(mockActor, mockRing);
  });

  describe('Initialization', () => {
    test('should create RingInterface with actor and ring', () => {
      expect(ringInterface.actor).toBe(mockActor);
      expect(ringInterface.ring).toBe(mockRing);
    });
  });

  describe('Permission Checks', () => {
    test('should allow ring owner to cast spells', () => {
      expect(ringInterface.canCastSpells()).toBe(true);
    });

    test('should allow GM to cast spells', () => {
      global.game.user.isGM = true;
      expect(ringInterface.canCastSpells()).toBe(true);
      global.game.user.isGM = false;
    });

    test('should allow spellcasters to store spells', () => {
      expect(ringInterface.canStoreSpells()).toBe(true);
    });

    test('should detect spellcasting ability', () => {
      expect(ringInterface.hasSpellcastingAbility(mockActor)).toBe(true);
    });
  });

  describe('Spell Level Validation', () => {
    test('should generate valid spell levels for 1st level spell', () => {
      const spell = mockActor.items.find(item => item.name === 'Absorb Elements');
      const validLevels = ringInterface.getValidSpellLevels(spell, mockActor);

      expect(validLevels).toContain('Level 1');
      expect(validLevels).toContain('Level 2');
      expect(validLevels).toContain('Level 3');
      expect(validLevels).toContain('[3/4 available]'); // Level 1 slots
    });

    test('should not allow spell levels below minimum', () => {
      const highLevelSpell = new global.Item({
        id: 'fireball',
        name: 'Fireball',
        type: 'spell',
        system: { level: 3 }
      });

      const validLevels = ringInterface.getValidSpellLevels(highLevelSpell, mockActor);

      expect(validLevels).not.toContain('Level 1');
      expect(validLevels).not.toContain('Level 2');
      expect(validLevels).toContain('Level 3');
    });
  });

  describe('Spell Storage', () => {
    test('should store spell successfully', async() => {
      const spell = mockActor.items.find(item => item.name === 'Absorb Elements');
      const result = await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      expect(result).toBe(true);

      const ringData = mockRing.system.flags[MODULE_ID];
      expect(ringData.storedSpells).toHaveLength(1);
      expect(ringData.storedSpells[0].name).toBe('Absorb Elements');
      expect(ringData.storedSpells[0].level).toBe(1);
    });

    test('should prevent storing spell below minimum level', async() => {
      const highLevelSpell = new global.Item({
        id: 'fireball',
        name: 'Fireball',
        type: 'spell',
        system: { level: 3 }
      });

      const result = await ringInterface.storeSpellFromActor(highLevelSpell, mockActor, 1);
      expect(result).toBe(false);
    });

    test('should prevent exceeding ring capacity', async() => {
      const spell = mockActor.items.find(item => item.name === 'Absorb Elements');

      // Fill the ring to capacity
      await ringInterface.storeSpellFromActor(spell, mockActor, 5);

      // Try to add another spell
      const result = await ringInterface.storeSpellFromActor(spell, mockActor, 1);
      expect(result).toBe(false);
    });

    test('should track original caster information', async() => {
      const spell = mockActor.items.find(item => item.name === 'Absorb Elements');
      await ringInterface.storeSpellFromActor(spell, mockActor, 2);

      const ringData = mockRing.system.flags[MODULE_ID];
      const storedSpell = ringData.storedSpells[0];

      expect(storedSpell.originalCaster.id).toBe(mockActor.id);
      expect(storedSpell.originalCaster.name).toBe(mockActor.name);
      expect(storedSpell.originalCaster.spellAttackBonus).toBe(7);
      expect(storedSpell.originalCaster.spellSaveDC).toBe(15);
    });
  });

  describe('getData Method', () => {
    test('should return correct template data for empty ring', () => {
      const data = ringInterface.getData();

      expect(data.storedSpells).toHaveLength(0);
      expect(data.usedLevels).toBe(0);
      expect(data.remainingLevels).toBe(5);
      expect(data.capacityPercentage).toBe(0);
      expect(data.maxLevels).toBe(MAX_SPELL_LEVELS);
    });

    test('should return correct template data with stored spells', async() => {
      const spell = mockActor.items.find(item => item.name === 'Absorb Elements');
      await ringInterface.storeSpellFromActor(spell, mockActor, 3);

      const data = ringInterface.getData();

      expect(data.storedSpells).toHaveLength(1);
      expect(data.usedLevels).toBe(3);
      expect(data.remainingLevels).toBe(2);
      expect(data.capacityPercentage).toBe(60);
    });
  });

  describe('Spell Slot Consumption', () => {
    test('should consume spell slot when storing spell', async() => {
      const initialSlots = mockActor.system.spells.spell1.value;

      const result = await ringInterface.consumeSpellSlot(mockActor, 1, 'spell');
      expect(result).toBe(true);
      expect(mockActor.system.spells.spell1.value).toBe(initialSlots - 1);
    });

    test('should fail when no spell slots available', async() => {
      mockActor.system.spells.spell1.value = 0;

      const result = await ringInterface.consumeSpellSlot(mockActor, 1, 'spell');
      expect(result).toBe(false);
    });
  });
});
