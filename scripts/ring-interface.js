/**
 * Ring of Spell Storing Interface
 * Provides the UI for managing stored spells in the ring
 */

const MODULE_ID = 'ring-of-spell-storing';
const MAX_SPELL_LEVELS = 5;

export class RingInterface extends Application {
  constructor(actor, ring, options = {}) {
    super(options);
    this.actor = actor;
    this.ring = ring;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'ring-of-spell-storing-interface',
      classes: ['ring-of-spell-storing'],
      template: 'modules/ring-of-spell-storing/templates/ring-interface.hbs',
      width: 500,
      height: 'auto',
      resizable: true,
      title: game.i18n.localize('RING_OF_SPELL_STORING.Interface.Title')
    });
  }

  getData() {
    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const storedSpells = ringData.storedSpells || [];
    const usedLevels = storedSpells.reduce((sum, spell) => sum + spell.level, 0);
    const remainingLevels = MAX_SPELL_LEVELS - usedLevels;
    const capacityPercentage = (usedLevels / MAX_SPELL_LEVELS) * 100;

    return {
      actor: this.actor,
      ring: this.ring,
      storedSpells: storedSpells,
      maxLevels: MAX_SPELL_LEVELS,
      usedLevels: usedLevels,
      remainingLevels: remainingLevels,
      capacityPercentage: capacityPercentage,
      canCast: this.canCastSpells(),
      canStore: this.canStoreSpells(),
      canManage: this.canManageRing()
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Store spell button
    html.find('[data-action="store"]').click(this._onStoreSpell.bind(this));

    // Cast spell buttons
    html.find('[data-action="cast"]').click(this._onCastSpell.bind(this));

    // Remove spell buttons
    html.find('[data-action="remove"]').click(this._onRemoveSpell.bind(this));

    // Close button
    html.find('[data-action="close"]').click(this._onClose.bind(this));
  }

  /**
   * Check if the current user can cast spells from the ring
   */
  canCastSpells() {
    return this.actor.isOwner && this.ring.system.equipped;
  }

  /**
   * Check if the current user can store spells in the ring
   */
  canStoreSpells() {
    return game.user.isGM || this.actor.isOwner;
  }

  /**
   * Check if the current user can manage the ring
   */
  canManageRing() {
    return game.user.isGM || this.actor.isOwner;
  }

  /**
   * Handle storing a spell in the ring
   */
  async _onStoreSpell(event) {
    event.preventDefault();
    
    const spells = this.actor.items.filter(item => 
      item.type === 'spell' && 
      item.system.level > 0 && 
      item.system.level <= 5
    );

    if (spells.length === 0) {
      ui.notifications.warn('No valid spells available to store.');
      return;
    }

    // Create spell selection dialog
    const spellOptions = spells.map(spell => 
      `<option value="${spell.id}">${spell.name} (Level ${spell.system.level})</option>`
    ).join('');

    const levelOptions = Array.from({length: 5}, (_, i) => i + 1)
      .map(level => `<option value="${level}">Level ${level}</option>`)
      .join('');

    const content = `
      <div class="form-group">
        <label>${game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.SelectSpell')}</label>
        <select id="spell-select">${spellOptions}</select>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.SelectSlotLevel')}</label>
        <select id="level-select">${levelOptions}</select>
      </div>
    `;

    new Dialog({
      title: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Title'),
      content: content,
      buttons: {
        store: {
          label: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Store'),
          callback: async (html) => {
            const spellId = html.find('#spell-select').val();
            const level = parseInt(html.find('#level-select').val());
            const spell = this.actor.items.get(spellId);
            
            if (spell && level) {
              await this.storeSpell(spell, level);
            }
          }
        },
        cancel: {
          label: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Cancel')
        }
      },
      default: 'store'
    }).render(true);
  }

  /**
   * Handle casting a spell from the ring
   */
  async _onCastSpell(event) {
    event.preventDefault();
    
    const spellIndex = parseInt(event.currentTarget.dataset.spellId);
    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) return;

    // Confirmation dialog
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.CastSpell.Title'),
      content: game.i18n.format('RING_OF_SPELL_STORING.Dialogs.CastSpell.Confirm', {
        spell: spellData.name,
        caster: spellData.originalCaster.name
      })
    });

    if (confirmed) {
      await this.castSpell(spellIndex);
    }
  }

  /**
   * Handle removing a spell from the ring
   */
  async _onRemoveSpell(event) {
    event.preventDefault();
    
    const spellIndex = parseInt(event.currentTarget.dataset.spellId);
    await this.removeSpell(spellIndex);
  }

  /**
   * Handle closing the interface
   */
  _onClose(event) {
    event.preventDefault();
    this.close();
  }

  /**
   * Store a spell in the ring
   */
  async storeSpell(spell, level) {
    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const usedLevels = ringData.storedSpells.reduce((sum, s) => sum + s.level, 0);
    
    if (usedLevels + level > MAX_SPELL_LEVELS) {
      ui.notifications.warn(
        game.i18n.format('RING_OF_SPELL_STORING.Notifications.InsufficientCapacity', {
          required: level,
          available: MAX_SPELL_LEVELS - usedLevels
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
        id: this.actor.id,
        name: this.actor.name,
        spellAttackBonus: this.actor.system.attributes.spellcasting?.attack || 0,
        spellSaveDC: this.actor.system.attributes.spellcasting?.dc || 8
      },
      storedAt: Date.now()
    };

    ringData.storedSpells.push(spellData);

    await this.ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellStored', {
        spell: spell.name
      })
    );

    this.render();
    return true;
  }

  /**
   * Cast a spell from the ring
   */
  async castSpell(spellIndex) {
    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];
    
    if (!spellData) return false;

    // Find the spell
    let spell = this.actor.items.get(spellData.id);
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
    
    const tempSpell = new CONFIG.Item.documentClass(tempSpellData, { parent: this.actor });

    // Cast the spell
    await tempSpell.roll({
      spellLevel: spellData.level,
      consumeSpellSlot: false,
      configureDialog: true
    });

    // Remove spell from ring
    ringData.storedSpells.splice(spellIndex, 1);
    await this.ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellCast', {
        spell: spellData.name
      })
    );

    this.render();
    return true;
  }

  /**
   * Remove a spell from the ring
   */
  async removeSpell(spellIndex) {
    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];
    
    if (!spellData) return false;

    ringData.storedSpells.splice(spellIndex, 1);
    await this.ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellRemoved', {
        spell: spellData.name
      })
    );

    this.render();
    return true;
  }
}
