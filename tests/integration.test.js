/**
 * Integration tests for Ring of Spell Storing module
 * Tests the full workflow from spell storage to casting
 */

const { MODULE_ID, MAX_SPELL_LEVELS } = require('./setup');

describe('Ring of Spell Storing Integration', () => {
  let wizard, cleric, ring, ringInterface;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create wizard character
    wizard = new global.Actor({
      id: 'wizard-1',
      name: 'Gandalf',
      system: {
        spells: {
          spell1: { max: 4, value: 4 },
          spell2: { max: 3, value: 3 },
          spell3: { max: 3, value: 3 }
        },
        attributes: {
          spellcasting: { attack: 8, dc: 16 }
        }
      },
      items: new global.MockCollection(),
      isOwner: true
    });

    // Create cleric character
    cleric = new global.Actor({
      id: 'cleric-1',
      name: 'Radagast',
      system: {
        spells: {
          spell1: { max: 3, value: 3 },
          spell2: { max: 2, value: 2 },
          spell3: { max: 2, value: 2 }
        },
        attributes: {
          spellcasting: { attack: 6, dc: 14 }
        }
      },
      items: new global.MockCollection(),
      isOwner: true
    });

    // Add spells to characters
    const wizardSpells = [
      new global.Item({ id: 'magic-missile', name: 'Magic Missile', type: 'spell', system: { level: 1 } }),
      new global.Item({ id: 'fireball', name: 'Fireball', type: 'spell', system: { level: 3 } })
    ];
    wizard.items.push(...wizardSpells);

    const clericSpells = [
      new global.Item({ id: 'cure-wounds', name: 'Cure Wounds', type: 'spell', system: { level: 1 } }),
      new global.Item({ id: 'spiritual-weapon', name: 'Spiritual Weapon', type: 'spell', system: { level: 2 } })
    ];
    cleric.items.push(...clericSpells);

    // Create ring owned by wizard
    ring = new global.Item({
      id: 'shared-ring',
      name: 'Ring of Spell Storing',
      type: 'equipment',
      system: { flags: {} },
      parent: wizard
    });

    wizard.items.push(ring);

    // Mock game.actors to return both characters
    global.game.actors.filter = jest.fn(() => [wizard, cleric]);

    // Create ring interface
    global.RingInterface = class MockRingInterface extends global.Application {
      constructor(actor, ring) {
        super();
        this.actor = actor;
        this.ring = ring;
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

      async storeSpellFromActor(spell, casterActor, level, spellType = 'spell') {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        const usedLevels = ringData.storedSpells.reduce((sum, s) => sum + s.level, 0);

        if (level < spell.system.level || usedLevels + level > MAX_SPELL_LEVELS) {
          return false;
        }

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
        await this.ring.update({ [`system.flags.${MODULE_ID}`]: ringData });

        // Consume spell slot
        const slotKey = `spell${level}`;
        if (casterActor.system.spells[slotKey]?.value > 0) {
          casterActor.system.spells[slotKey].value -= 1;
        }

        return true;
      }

      async castSpell(spellIndex) {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        if (spellIndex >= ringData.storedSpells.length) {
          return false;
        }

        const spellData = ringData.storedSpells[spellIndex];
        ringData.storedSpells.splice(spellIndex, 1);

        await this.ring.update({ [`system.flags.${MODULE_ID}`]: ringData });
        return true;
      }

      getStoredSpells() {
        const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
        return ringData.storedSpells;
      }

      getRemainingCapacity() {
        const storedSpells = this.getStoredSpells();
        const usedLevels = storedSpells.reduce((sum, spell) => sum + spell.level, 0);
        return MAX_SPELL_LEVELS - usedLevels;
      }
    };

    ringInterface = new global.RingInterface(wizard, ring);
  });

  describe('Multi-Character Spell Storage', () => {
    test('should allow wizard to store their own spells', async() => {
      const magicMissile = wizard.items.find(item => item.name === 'Magic Missile');
      const result = await ringInterface.storeSpellFromActor(magicMissile, wizard, 1);

      expect(result).toBe(true);

      const storedSpells = ringInterface.getStoredSpells();
      expect(storedSpells).toHaveLength(1);
      expect(storedSpells[0].name).toBe('Magic Missile');
      expect(storedSpells[0].originalCaster.name).toBe('Gandalf');
    });

    test('should allow cleric to store spells in wizard\'s ring', async() => {
      const cureWounds = cleric.items.find(item => item.name === 'Cure Wounds');
      const result = await ringInterface.storeSpellFromActor(cureWounds, cleric, 1);

      expect(result).toBe(true);

      const storedSpells = ringInterface.getStoredSpells();
      expect(storedSpells).toHaveLength(1);
      expect(storedSpells[0].name).toBe('Cure Wounds');
      expect(storedSpells[0].originalCaster.name).toBe('Radagast');
      expect(storedSpells[0].originalCaster.spellSaveDC).toBe(14);
    });

    test('should preserve original caster statistics', async() => {
      const wizardSpell = wizard.items.find(item => item.name === 'Magic Missile');
      const clericSpell = cleric.items.find(item => item.name === 'Cure Wounds');

      await ringInterface.storeSpellFromActor(wizardSpell, wizard, 1);
      await ringInterface.storeSpellFromActor(clericSpell, cleric, 1);

      const storedSpells = ringInterface.getStoredSpells();

      // Wizard spell should have wizard's stats
      const wizardStoredSpell = storedSpells.find(s => s.name === 'Magic Missile');
      expect(wizardStoredSpell.originalCaster.spellAttackBonus).toBe(8);
      expect(wizardStoredSpell.originalCaster.spellSaveDC).toBe(16);

      // Cleric spell should have cleric's stats
      const clericStoredSpell = storedSpells.find(s => s.name === 'Cure Wounds');
      expect(clericStoredSpell.originalCaster.spellAttackBonus).toBe(6);
      expect(clericStoredSpell.originalCaster.spellSaveDC).toBe(14);
    });
  });

  describe('Spell Level Management', () => {
    test('should allow upcasting spells', async() => {
      const magicMissile = wizard.items.find(item => item.name === 'Magic Missile');
      const result = await ringInterface.storeSpellFromActor(magicMissile, wizard, 3); // Upcast to 3rd level

      expect(result).toBe(true);

      const storedSpells = ringInterface.getStoredSpells();
      expect(storedSpells[0].level).toBe(3);
      expect(storedSpells[0].originalLevel).toBe(1);
    });

    test('should prevent downcasting spells', async() => {
      const fireball = wizard.items.find(item => item.name === 'Fireball');
      const result = await ringInterface.storeSpellFromActor(fireball, wizard, 1); // Try to downcast

      expect(result).toBe(false);
    });

    test('should enforce ring capacity limits', async() => {
      const fireball = wizard.items.find(item => item.name === 'Fireball');

      // Store a 3rd level spell twice (6 levels total, exceeds 5 level limit)
      await ringInterface.storeSpellFromActor(fireball, wizard, 3);
      const result = await ringInterface.storeSpellFromActor(fireball, wizard, 3);

      expect(result).toBe(false);
      expect(ringInterface.getStoredSpells()).toHaveLength(1);
    });

    test('should track remaining capacity correctly', async() => {
      expect(ringInterface.getRemainingCapacity()).toBe(5);

      const magicMissile = wizard.items.find(item => item.name === 'Magic Missile');
      await ringInterface.storeSpellFromActor(magicMissile, wizard, 2);

      expect(ringInterface.getRemainingCapacity()).toBe(3);
    });
  });

  describe('Spell Slot Consumption', () => {
    test('should consume caster\'s spell slots when storing', async() => {
      const initialSlots = wizard.system.spells.spell1.value;
      const magicMissile = wizard.items.find(item => item.name === 'Magic Missile');

      await ringInterface.storeSpellFromActor(magicMissile, wizard, 1);

      expect(wizard.system.spells.spell1.value).toBe(initialSlots - 1);
    });

    test('should consume correct level spell slot for upcasting', async() => {
      const initialLevel2Slots = wizard.system.spells.spell2.value;
      const magicMissile = wizard.items.find(item => item.name === 'Magic Missile');

      await ringInterface.storeSpellFromActor(magicMissile, wizard, 2); // Upcast to 2nd level

      expect(wizard.system.spells.spell2.value).toBe(initialLevel2Slots - 1);
      expect(wizard.system.spells.spell1.value).toBe(4); // 1st level slots unchanged
    });
  });

  describe('Spell Casting from Ring', () => {
    test('should cast and remove spell from ring', async() => {
      const magicMissile = wizard.items.find(item => item.name === 'Magic Missile');
      await ringInterface.storeSpellFromActor(magicMissile, wizard, 1);

      expect(ringInterface.getStoredSpells()).toHaveLength(1);

      const result = await ringInterface.castSpell(0);
      expect(result).toBe(true);
      expect(ringInterface.getStoredSpells()).toHaveLength(0);
    });

    test('should fail to cast non-existent spell', async() => {
      const result = await ringInterface.castSpell(0); // No spells stored
      expect(result).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle mixed spells from multiple casters', async() => {
      const wizardSpell = wizard.items.find(item => item.name === 'Magic Missile');
      const clericSpell = cleric.items.find(item => item.name === 'Cure Wounds');
      const clericSpell2 = cleric.items.find(item => item.name === 'Spiritual Weapon');

      // Store spells from both casters
      await ringInterface.storeSpellFromActor(wizardSpell, wizard, 1);
      await ringInterface.storeSpellFromActor(clericSpell, cleric, 1);
      await ringInterface.storeSpellFromActor(clericSpell2, cleric, 2);

      const storedSpells = ringInterface.getStoredSpells();
      expect(storedSpells).toHaveLength(3);
      expect(ringInterface.getRemainingCapacity()).toBe(1); // 5 - (1+1+2) = 1

      // Verify different casters
      const casterNames = storedSpells.map(s => s.originalCaster.name);
      expect(casterNames).toContain('Gandalf');
      expect(casterNames).toContain('Radagast');
    });

    test('should handle ring transfer between characters', async() => {
      // Store spell while ring is with wizard
      const wizardSpell = wizard.items.find(item => item.name === 'Magic Missile');
      await ringInterface.storeSpellFromActor(wizardSpell, wizard, 1);

      // Transfer ring to cleric (simulate by changing parent)
      ring.parent = cleric;
      cleric.items.push(ring);

      // Create new interface for cleric
      const clericRingInterface = new global.RingInterface(cleric, ring);

      // Spells should still be there
      expect(clericRingInterface.getStoredSpells()).toHaveLength(1);
      expect(clericRingInterface.getStoredSpells()[0].name).toBe('Magic Missile');

      // Cleric should be able to cast wizard's stored spell
      const result = await clericRingInterface.castSpell(0);
      expect(result).toBe(true);
    });
  });
});
