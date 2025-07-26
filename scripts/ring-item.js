/**
 * Ring of Spell Storing Item Class
 * Extends the base Item5e class to provide ring-specific functionality
 */

const MODULE_ID = 'ring-of-spell-storing';
const MAX_SPELL_LEVELS = 5;

export class RingItem extends CONFIG.Item.documentClass {

  /**
   * Get the stored spells data
   */
  get storedSpells() {
    return this.system.flags?.[MODULE_ID]?.storedSpells || [];
  }

  /**
   * Get the used spell levels
   */
  get usedLevels() {
    return this.storedSpells.reduce((sum, spell) => sum + spell.level, 0);
  }

  /**
   * Get the remaining spell levels
   */
  get remainingLevels() {
    return MAX_SPELL_LEVELS - this.usedLevels;
  }

  /**
   * Check if the ring has capacity for a spell of the given level
   */
  hasCapacity(spellLevel) {
    return this.remainingLevels >= spellLevel;
  }

  /**
   * Store a spell in the ring
   */
  async storeSpell(spell, level, originalCaster) {
    if (!this.hasCapacity(level)) {
      ui.notifications.warn(
        game.i18n.format('RING_OF_SPELL_STORING.Notifications.InsufficientCapacity', {
          required: level,
          available: this.remainingLevels
        })
      );
      return false;
    }

    // Check if self-targeting spells are allowed
    const allowSelfSpells = game.settings.get(MODULE_ID, 'allowSelfSpells');
    if (!allowSelfSpells && spell.system.target?.type === 'self') {
      ui.notifications.warn('Self-targeting spells cannot be stored in the ring.');
      return false;
    }

    const spellData = {
      id: spell.id,
      name: spell.name,
      level: level,
      originalCaster: {
        id: originalCaster.id,
        name: originalCaster.name,
        spellAttackBonus: originalCaster.system.attributes.spellcasting?.attack || 0,
        spellSaveDC: originalCaster.system.attributes.spellcasting?.dc || 8
      },
      storedAt: Date.now()
    };

    const currentData = this.system.flags?.[MODULE_ID] || { storedSpells: [] };
    currentData.storedSpells.push(spellData);

    await this.update({
      [`system.flags.${MODULE_ID}`]: currentData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellStored', {
        spell: spell.name
      })
    );

    return true;
  }

  /**
   * Cast a spell from the ring
   */
  async castSpell(spellIndex, caster) {
    const spellData = this.storedSpells[spellIndex];
    if (!spellData) {
      return false;
    }

    // Find the spell
    let spell = caster.items.get(spellData.id);
    if (!spell) {
      // Try to find in compendium
      const pack = game.packs.get('dnd5e.spells');
      if (pack) {
        spell = await pack.getDocument(spellData.id);
      }
    }

    if (!spell) {
      ui.notifications.error(`Spell ${spellData.name} not found`);
      return false;
    }

    // Create a temporary spell item with original caster's stats
    const tempSpellData = foundry.utils.duplicate(spell.toObject());
    tempSpellData.system.preparation = { mode: 'always', prepared: true };

    const tempSpell = new CONFIG.Item.documentClass(tempSpellData, { parent: caster });

    // Modify the spell roll to use original caster's stats
    const originalRoll = tempSpell.roll;
    tempSpell.roll = async function(options = {}) {
      options.spellAttackBonus = spellData.originalCaster.spellAttackBonus;
      options.spellSaveDC = spellData.originalCaster.spellSaveDC;
      options.consumeSpellSlot = false;
      return originalRoll.call(this, options);
    };

    // Cast the spell
    await tempSpell.roll({
      spellLevel: spellData.level,
      configureDialog: true
    });

    // Remove spell from ring
    await this.removeSpell(spellIndex);

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellCast', {
        spell: spellData.name
      })
    );

    return true;
  }

  /**
   * Remove a spell from the ring
   */
  async removeSpell(spellIndex) {
    const currentData = this.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = currentData.storedSpells[spellIndex];

    if (!spellData) {
      return false;
    }

    currentData.storedSpells.splice(spellIndex, 1);
    await this.update({
      [`system.flags.${MODULE_ID}`]: currentData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellRemoved', {
        spell: spellData.name
      })
    );

    return true;
  }

  /**
   * Clear all stored spells
   */
  async clearAllSpells() {
    await this.update({
      [`system.flags.${MODULE_ID}`]: { storedSpells: [] }
    });

    ui.notifications.info('All spells removed from the Ring of Spell Storing.');
    return true;
  }

  /**
   * Get spell data for display
   */
  getSpellDisplayData() {
    return this.storedSpells.map((spell, index) => ({
      ...spell,
      index: index,
      storedDate: new Date(spell.storedAt).toLocaleDateString()
    }));
  }

  /**
   * Export ring data for transfer or backup
   */
  exportRingData() {
    return {
      storedSpells: this.storedSpells,
      usedLevels: this.usedLevels,
      remainingLevels: this.remainingLevels,
      exportedAt: Date.now()
    };
  }

  /**
   * Import ring data from backup
   */
  async importRingData(data) {
    if (!data.storedSpells || !Array.isArray(data.storedSpells)) {
      ui.notifications.error('Invalid ring data format.');
      return false;
    }

    // Validate total spell levels
    const totalLevels = data.storedSpells.reduce((sum, spell) => sum + spell.level, 0);
    if (totalLevels > MAX_SPELL_LEVELS) {
      ui.notifications.error('Ring data exceeds maximum capacity.');
      return false;
    }

    await this.update({
      [`system.flags.${MODULE_ID}`]: { storedSpells: data.storedSpells }
    });

    ui.notifications.info('Ring data imported successfully.');
    return true;
  }

  /**
   * Override the item's use method to open the ring interface
   */
  async use(config = {}, options = {}) {
    if (this.name === 'Ring of Spell Storing') {
      // Open the ring interface instead of normal item usage
      const RingInterface = (await import('./ring-interface.js')).RingInterface;
      new RingInterface(this.actor, this).render(true);
      return;
    }

    return super.use(config, options);
  }

  /**
   * Override the item's roll method for ring-specific behavior
   */
  async roll(options = {}) {
    if (this.name === 'Ring of Spell Storing') {
      // Show ring information in chat
      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: await this.getChatData()
      };

      return ChatMessage.create(chatData);
    }

    return super.roll(options);
  }

  /**
   * Get chat data for the ring
   */
  async getChatData() {
    const template = 'modules/ring-of-spell-storing/templates/ring-chat.hbs';
    const templateData = {
      item: this,
      storedSpells: this.getSpellDisplayData(),
      usedLevels: this.usedLevels,
      remainingLevels: this.remainingLevels,
      maxLevels: MAX_SPELL_LEVELS
    };

    return renderTemplate(template, templateData);
  }
}
