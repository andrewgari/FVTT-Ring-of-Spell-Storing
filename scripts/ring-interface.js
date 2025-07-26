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
   * Any spellcaster can store spells, not just the owner
   */
  canStoreSpells() {
    // GM can always store spells
    if (game.user.isGM) {
      return true;
    }

    // Check if the user has any owned actors with spellcasting ability
    const ownedActors = game.actors.filter(actor => actor.isOwner);
    return ownedActors.some(actor => this.hasSpellcastingAbility(actor));
  }

  /**
   * Check if the current user can manage the ring
   */
  canManageRing() {
    return game.user.isGM || this.actor.isOwner;
  }

  /**
   * Check if an actor has spellcasting ability
   */
  hasSpellcastingAbility(actor) {
    // Check if actor has spell slots
    const spellcasting = actor.system.spells;
    if (spellcasting) {
      for (let level = 1; level <= 9; level++) {
        if (spellcasting[`spell${level}`]?.max > 0) {
          return true;
        }
      }
    }

    // Check if actor has any spells
    const hasSpells = actor.items.some(item => item.type === 'spell' && item.system.level > 0);
    return hasSpells;
  }

  /**
   * Handle storing a spell in the ring
   */
  async _onStoreSpell(event) {
    event.preventDefault();

    // Get all owned actors with spellcasting ability
    const spellcasters = game.actors.filter(actor =>
      actor.isOwner && this.hasSpellcastingAbility(actor)
    );

    if (spellcasters.length === 0) {
      ui.notifications.warn(game.i18n.localize('RING_OF_SPELL_STORING.Warnings.NoSpellcastersAvailable'));
      return;
    }

    // Collect all available spells from all spellcasters
    const allSpells = [];
    spellcasters.forEach(actor => {
      const actorSpells = actor.items.filter(item =>
        item.type === 'spell' &&
        item.system.level > 0 &&
        item.system.level <= 5
      );
      actorSpells.forEach(spell => {
        allSpells.push({
          spell: spell,
          actor: actor,
          displayName: `${spell.name} (Level ${spell.system.level}) - ${actor.name}`
        });
      });
    });

    if (allSpells.length === 0) {
      ui.notifications.warn(game.i18n.localize('RING_OF_SPELL_STORING.Warnings.NoSpellsAvailable'));
      return;
    }

    // Create spell selection dialog
    const spellOptions = allSpells.map((entry, index) =>
      `<option value="${index}">${entry.displayName}</option>`
    ).join('');

    const levelOptions = Array.from({ length: 5 }, (_, i) => i + 1)
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

    const self = this;
    new Dialog({
      title: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Title'),
      content: content,
      buttons: {
        store: {
          label: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Store'),
          callback: async(html) => {
            const spellIndex = parseInt(html.find('#spell-select').val());
            const level = parseInt(html.find('#level-select').val());
            const spellEntry = allSpells[spellIndex];

            if (spellEntry && level) {
              await self.storeSpellFromActor(spellEntry.spell, spellEntry.actor, level);
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

    if (!spellData) {
      return;
    }

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
   * Store a spell in the ring from a specific actor
   */
  async storeSpellFromActor(spell, casterActor, level) {
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
        id: casterActor.id,
        name: casterActor.name,
        spellAttackBonus: casterActor.system.attributes.spellcasting?.attack || 0,
        spellSaveDC: casterActor.system.attributes.spellcasting?.dc || 8
      },
      storedAt: Date.now()
    };

    ringData.storedSpells.push(spellData);

    await this.ring.update({
      [`system.flags.${MODULE_ID}`]: ringData
    });

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellStored', {
        spell: spell.name,
        level: level,
        caster: casterActor.name
      })
    );

    this.render();
    return true;
  }

  /**
   * Store a spell in the ring (legacy method for backward compatibility)
   */
  async storeSpell(spell, level) {
    return this.storeSpellFromActor(spell, this.actor, level);
  }

  /**
   * Cast a spell from the ring
   */
  async castSpell(spellIndex) {
    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) {
      return false;
    }

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

    if (!spellData) {
      return false;
    }

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
