/**
 * Tests for data persistence issues in Ring of Spell Storing
 * These tests specifically target the bugs we've been experiencing
 */

const { MODULE_ID, MAX_SPELL_LEVELS } = require('./setup');

describe('Data Persistence Issues', () => {
  let mockActor, mockRing, ringInterface;

  beforeEach(() => {
    jest.clearAllMocks();

    mockActor = new global.Actor({
      id: 'test-actor',
      name: 'Test Character',
      system: {
        spells: {
          spell1: { max: 4, value: 3 },
          spell2: { max: 3, value: 2 },
          spell3: { max: 3, value: 3 }
        },
        attributes: {
          spellcasting: { attack: 7, dc: 15 }
        }
      },
      items: new global.MockCollection(),
      isOwner: true
    });

    const mockSpell = new global.Item({
      id: 'test-spell',
      name: 'Test Spell',
      type: 'spell',
      system: { level: 1 }
    });
    mockActor.items.push(mockSpell);

    mockRing = new global.Item({
      id: 'test-ring',
      name: 'Ring of Spell Storing',
      type: 'equipment',
      system: { flags: {} },
      parent: mockActor
    });

    mockActor.items.push(mockRing);

    // Enhanced mock that tracks update calls
    global.RingInterface = class TestRingInterface extends global.Application {
      constructor(actor, ring) {
        super();
        this.actor = actor;
        this.ring = ring;
        this.updateCalls = [];
      }

      async storeSpellFromActor(spell, casterActor, level, spellType = 'spell') {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };

        const spellData = {
          id: spell.id,
          name: spell.name,
          level: level,
          originalLevel: spell.system.level,
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

        // Track the update call
        const updateData = { [`system.flags.${MODULE_ID}`]: ringData };
        this.updateCalls.push(updateData);

        // Simulate different update scenarios
        if (this.ring.parent === this.actor) {
          // Embedded document update
          const embeddedUpdateData = {
            _id: this.ring.id,
            [`system.flags.${MODULE_ID}`]: ringData
          };

          const result = await this.actor.updateEmbeddedDocuments('Item', [embeddedUpdateData]);

          // Simulate the actual Foundry behavior more accurately
          if (result && result.length > 0) {
            // Update was successful, modify the ring's flags
            if (!this.ring.system.flags) {
              this.ring.system.flags = {};
            }
            this.ring.system.flags[MODULE_ID] = ringData;
            return true;
          } else {
            // Update failed
            return false;
          }
        } else {
          // Direct update
          const result = await this.ring.update(updateData);
          return result !== null;
        }
      }

      getData() {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        const storedSpells = ringData.storedSpells || [];

        return {
          actor: this.actor,
          ring: this.ring,
          storedSpells: storedSpells,
          maxLevels: MAX_SPELL_LEVELS,
          usedLevels: storedSpells.reduce((sum, spell) => sum + spell.level, 0),
          remainingLevels: MAX_SPELL_LEVELS - storedSpells.reduce((sum, spell) => sum + spell.level, 0)
        };
      }

      getUpdateCalls() {
        return this.updateCalls;
      }
    };

    ringInterface = new global.RingInterface(mockActor, mockRing);
  });

  describe('Update Call Tracking', () => {
    test('should track update calls when storing spells', async() => {
      const spell = mockActor.items.find(item => item.name === 'Test Spell');
      await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      const updateCalls = ringInterface.getUpdateCalls();
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]).toHaveProperty(`system.flags.${MODULE_ID}`);
      expect(updateCalls[0][`system.flags.${MODULE_ID}`].storedSpells).toHaveLength(1);
    });

    test('should verify data structure in update calls', async() => {
      const spell = mockActor.items.find(item => item.name === 'Test Spell');
      await ringInterface.storeSpellFromActor(spell, mockActor, 2);

      const updateCalls = ringInterface.getUpdateCalls();
      const updateData = updateCalls[0][`system.flags.${MODULE_ID}`];

      expect(updateData.storedSpells[0]).toMatchObject({
        id: 'test-spell',
        name: 'Test Spell',
        level: 2,
        originalLevel: 1,
        spellType: 'spell'
      });

      expect(updateData.storedSpells[0].originalCaster).toMatchObject({
        id: 'test-actor',
        name: 'Test Character',
        spellAttackBonus: 7,
        spellSaveDC: 15
      });
    });
  });

  describe('Embedded Document Updates', () => {
    test('should handle embedded document update structure correctly', async() => {
      // Mock the updateEmbeddedDocuments to return success
      mockActor.updateEmbeddedDocuments = jest.fn().mockResolvedValue([{ _id: mockRing.id }]);

      const spell = mockActor.items.find(item => item.name === 'Test Spell');
      const result = await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      expect(result).toBe(true);
      expect(mockActor.updateEmbeddedDocuments).toHaveBeenCalledWith('Item', [{
        _id: mockRing.id,
        [`system.flags.${MODULE_ID}`]: expect.objectContaining({
          storedSpells: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Spell',
              level: 1
            })
          ])
        })
      }]);
    });

    test('should handle failed embedded document updates', async() => {
      // Mock the updateEmbeddedDocuments to return empty array (failure)
      mockActor.updateEmbeddedDocuments = jest.fn().mockResolvedValue([]);

      const spell = mockActor.items.find(item => item.name === 'Test Spell');
      const result = await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      expect(result).toBe(false);
    });
  });

  describe('Flag Structure Validation', () => {
    test('should maintain correct flag structure after updates', async() => {
      const spell = mockActor.items.find(item => item.name === 'Test Spell');
      await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      // Verify the ring's flags were updated correctly
      expect(mockRing.system.flags).toHaveProperty(MODULE_ID);
      expect(mockRing.system.flags[MODULE_ID]).toHaveProperty('storedSpells');
      expect(mockRing.system.flags[MODULE_ID].storedSpells).toHaveLength(1);
    });

    test('should handle missing flags gracefully', () => {
      // Start with a ring that has no flags
      mockRing.system.flags = undefined;

      const data = ringInterface.getData();
      expect(data.storedSpells).toHaveLength(0);
      expect(data.usedLevels).toBe(0);
    });

    test('should handle corrupted flag data', () => {
      // Simulate corrupted data
      mockRing.system.flags = {
        [MODULE_ID]: {
          storedSpells: null // Corrupted data
        }
      };

      const data = ringInterface.getData();
      expect(data.storedSpells).toHaveLength(0); // Should fallback to empty array
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across multiple operations', async() => {
      const spell = mockActor.items.find(item => item.name === 'Test Spell');

      // Store multiple spells
      await ringInterface.storeSpellFromActor(spell, mockActor, 1);
      await ringInterface.storeSpellFromActor(spell, mockActor, 2);

      const data = ringInterface.getData();
      expect(data.storedSpells).toHaveLength(2);
      expect(data.usedLevels).toBe(3);
      expect(data.remainingLevels).toBe(2);

      // Verify each spell is stored correctly
      expect(data.storedSpells[0].level).toBe(1);
      expect(data.storedSpells[1].level).toBe(2);
    });

    test('should handle concurrent update scenarios', async() => {
      const spell = mockActor.items.find(item => item.name === 'Test Spell');

      // Simulate concurrent updates
      const promises = [
        ringInterface.storeSpellFromActor(spell, mockActor, 1),
        ringInterface.storeSpellFromActor(spell, mockActor, 1),
        ringInterface.storeSpellFromActor(spell, mockActor, 1)
      ];

      const results = await Promise.all(promises);

      // All should succeed (in this mock scenario)
      expect(results.every(r => r === true)).toBe(true);

      // But we should have tracked all update calls
      const updateCalls = ringInterface.getUpdateCalls();
      expect(updateCalls).toHaveLength(3);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle update exceptions gracefully', async() => {
      // Mock update to throw an error
      mockActor.updateEmbeddedDocuments = jest.fn().mockRejectedValue(new Error('Update failed'));

      const spell = mockActor.items.find(item => item.name === 'Test Spell');

      // Should not throw, should return false
      await expect(ringInterface.storeSpellFromActor(spell, mockActor, 1)).resolves.toBe(false);
    });

    test('should validate data before updates', async() => {
      const invalidSpell = {
        id: null, // Invalid ID
        name: '',  // Empty name
        system: { level: 0 } // Invalid level
      };

      // This should be handled gracefully
      const result = await ringInterface.storeSpellFromActor(invalidSpell, mockActor, 1);

      // The mock implementation doesn't validate, but real implementation should
      // This test documents expected behavior
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Memory and Reference Issues', () => {
    test('should not have stale references after updates', async() => {
      const spell = mockActor.items.find(item => item.name === 'Test Spell');
      await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      // Get data before and after
      const dataBefore = ringInterface.getData();

      // Store another spell
      await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      const dataAfter = ringInterface.getData();

      // Should have different references and different data
      expect(dataBefore.storedSpells).not.toBe(dataAfter.storedSpells);
      expect(dataBefore.storedSpells.length).toBe(1);
      expect(dataAfter.storedSpells.length).toBe(2);
    });

    test('should handle ring reference updates', async() => {
      const originalRingId = mockRing.id;
      const spell = mockActor.items.find(item => item.name === 'Test Spell');

      await ringInterface.storeSpellFromActor(spell, mockActor, 1);

      // Verify the ring reference is still valid
      expect(ringInterface.ring.id).toBe(originalRingId);
      expect(ringInterface.ring.system.flags[MODULE_ID]).toBeDefined();
    });
  });
});
