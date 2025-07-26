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
    console.log(`=== RingInterface.getData() called ===`);
    console.log(`Ring ID: ${this.ring.id}`);
    console.log(`Ring flags:`, this.ring.system.flags);

    // Get fresh ring data to ensure we have the latest information
    const freshRing = this.actor.items.get(this.ring.id) || game.items.get(this.ring.id) || this.ring;
    this.ring = freshRing; // Update our reference

    const ringData = freshRing.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const storedSpells = ringData.storedSpells || [];

    console.log(`Fresh ring data from flags:`, ringData);
    console.log(`Stored spells array:`, storedSpells);
    console.log(`Number of stored spells: ${storedSpells.length}`);

    // Validate stored spells data integrity
    const validStoredSpells = storedSpells.filter(spell => {
      if (!spell || typeof spell !== 'object') {
        console.warn('Invalid spell data found:', spell);
        return false;
      }
      if (!spell.name || !spell.level || !spell.originalCaster) {
        console.warn('Incomplete spell data found:', spell);
        return false;
      }
      return true;
    });

    if (validStoredSpells.length !== storedSpells.length) {
      console.warn(`Filtered out ${storedSpells.length - validStoredSpells.length} invalid spell entries`);
    }

    const usedLevels = validStoredSpells.reduce((sum, spell) => sum + spell.level, 0);
    const remainingLevels = MAX_SPELL_LEVELS - usedLevels;
    const capacityPercentage = (usedLevels / MAX_SPELL_LEVELS) * 100;

    const templateData = {
      actor: this.actor,
      ring: freshRing,
      storedSpells: validStoredSpells,
      maxLevels: MAX_SPELL_LEVELS,
      usedLevels: usedLevels,
      remainingLevels: remainingLevels,
      capacityPercentage: capacityPercentage,
      canCast: this.canCastSpells(),
      canStore: this.canStoreSpells(),
      canManage: this.canManageRing()
    };

    console.log(`Template data being returned:`, templateData);
    console.log(`Valid stored spells count: ${validStoredSpells.length}`);
    console.log(`=== End getData() ===`);

    return templateData;
  }

  async _renderInner(data) {
    console.log(`=== _renderInner called ===`);
    console.log(`Data passed to template:`, data);
    console.log(`Stored spells in render data:`, data.storedSpells);

    const html = await super._renderInner(data);

    console.log(`Rendered HTML length:`, html[0].outerHTML.length);
    console.log(`Number of .stored-spell-item elements:`, html.find('.stored-spell-item').length);
    console.log(`=== End _renderInner ===`);

    return html;
  }

  activateListeners(html) {
    super.activateListeners(html);

    console.log(`=== activateListeners called ===`);
    console.log(`Number of .stored-spell-item elements in DOM:`, html.find('.stored-spell-item').length);

    // Store spell button
    html.find('[data-action="store"]').click(this._onStoreSpell.bind(this));

    // Cast spell buttons
    html.find('[data-action="cast"]').click(this._onCastSpell.bind(this));

    // Remove spell buttons
    html.find('[data-action="remove"]').click(this._onRemoveSpell.bind(this));

    // Close button
    html.find('[data-action="close"]').click(this._onClose.bind(this));

    console.log(`=== End activateListeners ===`);
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
   * Get valid spell slot levels for a spell and actor (returns HTML options)
   */
  getValidSpellLevels(spell, actor) {
    const validLevels = this.getValidSpellLevelsArray(spell, actor);

    // Generate HTML options
    const options = validLevels.map(slot => {
      const slotType = slot.type === 'pact' ? ' (Pact)' : '';
      const availability = slot.available > 0 ? ` [${slot.available}/${slot.max} available]` : ' [No slots]';
      return `<option value="${slot.level}" data-type="${slot.type}" ${slot.available === 0 ? 'disabled' : ''}>
        Level ${slot.level}${slotType}${availability}
      </option>`;
    }).join('');

    console.log(`Generated options for ${spell.name}:`, options);
    return options;
  }

  /**
   * Get valid spell slot levels for a spell and actor (returns array of objects)
   */
  getValidSpellLevelsArray(spell, actor) {
    const spellMinLevel = spell.system.level;
    const spellcasting = actor.system.spells;
    const validLevels = [];

    console.log(`Getting valid levels for ${spell.name} (min level: ${spellMinLevel})`);

    // Check regular spell slots - only levels >= spell's minimum level
    for (let level = spellMinLevel; level <= 5; level++) { // Ring only stores up to 5th level
      const slotData = spellcasting[`spell${level}`];
      if (slotData && slotData.max > 0) {
        validLevels.push({
          level: level,
          type: 'spell',
          available: slotData.value || 0,
          max: slotData.max
        });
        console.log(`Found spell slot level ${level}: ${slotData.value}/${slotData.max} available`);
      }
    }

    // Check pact magic slots (Warlock) - only if pact level >= spell minimum
    if (spellcasting.pact && spellcasting.pact.max > 0) {
      const pactLevel = spellcasting.pact.level;
      if (pactLevel >= spellMinLevel && pactLevel <= 5) {
        validLevels.push({
          level: pactLevel,
          type: 'pact',
          available: spellcasting.pact.value || 0,
          max: spellcasting.pact.max
        });
        console.log(`Found pact slot level ${pactLevel}: ${spellcasting.pact.value}/${spellcasting.pact.max} available`);
      }
    }

    return validLevels;
  }

  /**
   * Validate spell level selection in the dialog
   */
  validateSpellLevelSelection(html, spellEntry) {
    const selectedLevel = parseInt(html.find('#level-select').val());
    const minLevel = spellEntry.minLevel;
    const warningElement = html.find('#validation-warning');
    const storeButton = html.find('button[data-button="store"]');

    if (selectedLevel && selectedLevel < minLevel) {
      warningElement.show();
      warningElement.find('small').text(
        `⚠️ Invalid selection: ${spellEntry.spell.name} cannot be cast at level ${selectedLevel}. Minimum level is ${minLevel}.`
      );
      if (storeButton.length) {
        storeButton.prop('disabled', true);
      }
    } else {
      warningElement.hide();
      if (storeButton.length) {
        storeButton.prop('disabled', false);
      }
    }
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

    // Collect all available spells from all spellcasters with available spell slots
    const allSpells = [];
    spellcasters.forEach(actor => {
      const actorSpells = actor.items.filter(item =>
        item.type === 'spell' &&
        item.system.level > 0 &&
        item.system.level <= 5
      );

      actorSpells.forEach(spell => {
        // Only include spells where the actor has available spell slots at the spell's minimum level or higher
        const validLevels = this.getValidSpellLevelsArray(spell, actor);
        if (validLevels.length > 0) {
          allSpells.push({
            spell: spell,
            actor: actor,
            displayName: `${spell.name} (Level ${spell.system.level}) - ${actor.name}`,
            minLevel: spell.system.level,
            validLevels: validLevels
          });
        }
      });
    });

    if (allSpells.length === 0) {
      ui.notifications.warn(game.i18n.localize('RING_OF_SPELL_STORING.Warnings.NoSpellsAvailable'));
      return;
    }

    // Create spell selection dialog with enhanced validation
    const spellOptions = allSpells.map((entry, index) =>
      `<option value="${index}" data-min-level="${entry.minLevel}">${entry.displayName}</option>`
    ).join('');

    // Start with first spell's valid levels
    const firstSpell = allSpells[0];
    const initialLevelOptions = this.getValidSpellLevels(firstSpell.spell, firstSpell.actor);

    const content = `
      <div class="form-group">
        <label>${game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.SelectSpell')}</label>
        <select id="spell-select">${spellOptions}</select>
        <div class="spell-info">
          <small id="spell-min-level">Minimum spell level: ${firstSpell.minLevel}</small>
        </div>
      </div>
      <div class="form-group">
        <label>${game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.SelectSlotLevel')}</label>
        <select id="level-select">${initialLevelOptions}</select>
        <small class="notes">Choose the spell slot level to use. Spells cannot be cast at levels lower than their base level.</small>
      </div>
      <div class="form-group">
        <div class="validation-warning" id="validation-warning" style="color: red; display: none;">
          <small>⚠️ Invalid selection: This spell cannot be cast at the selected level.</small>
        </div>
      </div>
    `;

    const self = this;
    const dialog = new Dialog({
      title: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Title'),
      content: content,
      buttons: {
        store: {
          label: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Store'),
          callback: async(html) => {
            const spellIndex = parseInt(html.find('#spell-select').val());
            const level = parseInt(html.find('#level-select').val());
            const spellType = html.find('#level-select option:selected').data('type');
            const spellEntry = allSpells[spellIndex];

            // Final validation before storing
            if (spellEntry && level && level >= spellEntry.minLevel) {
              await self.storeSpellFromActor(spellEntry.spell, spellEntry.actor, level, spellType);
            } else {
              ui.notifications.error(`Cannot store ${spellEntry?.spell.name} at level ${level}. Minimum level is ${spellEntry?.minLevel}.`);
            }
          }
        },
        cancel: {
          label: game.i18n.localize('RING_OF_SPELL_STORING.Dialogs.StoreSpell.Cancel')
        }
      },
      default: 'store',
      render: (html) => {
        // Add event listener for spell selection change
        html.find('#spell-select').on('change', function() {
          const selectedIndex = parseInt($(this).val());
          const selectedSpell = allSpells[selectedIndex];
          if (selectedSpell) {
            const newLevelOptions = self.getValidSpellLevels(selectedSpell.spell, selectedSpell.actor);
            html.find('#level-select').html(newLevelOptions);
            html.find('#spell-min-level').text(`Minimum spell level: ${selectedSpell.minLevel}`);
            self.validateSpellLevelSelection(html, selectedSpell);
          }
        });

        // Add event listener for level selection change
        html.find('#level-select').on('change', function() {
          const selectedIndex = parseInt(html.find('#spell-select').val());
          const selectedSpell = allSpells[selectedIndex];
          if (selectedSpell) {
            self.validateSpellLevelSelection(html, selectedSpell);
          }
        });

        // Initial validation
        self.validateSpellLevelSelection(html, firstSpell);
      }
    });

    dialog.render(true);
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
  async storeSpellFromActor(spell, casterActor, level, spellType = 'spell') {
    console.log(`Attempting to store ${spell.name} at level ${level} (min: ${spell.system.level}) from ${casterActor.name}`);
    console.log(`MODULE_ID:`, MODULE_ID);
    console.log(`Ring type:`, this.ring.constructor.name);
    console.log(`Ring is owned item:`, this.ring.parent === this.actor);

    const ringData = this.ring.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const usedLevels = ringData.storedSpells.reduce((sum, s) => sum + s.level, 0);

    console.log(`Current ring data:`, ringData);
    console.log(`Used levels: ${usedLevels}/${MAX_SPELL_LEVELS}`);

    // Validate spell level
    const minLevel = spell.system.level;
    if (level < minLevel) {
      ui.notifications.error(`Cannot cast ${spell.name} at level ${level}. Minimum level is ${minLevel}.`);
      console.error(`Invalid spell level: ${level} < ${minLevel}`);
      return false;
    }

    if (level > 5) {
      ui.notifications.error(`Ring of Spell Storing can only store spells up to 5th level.`);
      return false;
    }

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

    // Consume the spell slot
    const consumed = await this.consumeSpellSlot(casterActor, level, spellType);
    if (!consumed) {
      ui.notifications.error(`No available ${spellType === 'pact' ? 'pact' : 'spell'} slots of level ${level}.`);
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
    console.log(`Added spell data:`, spellData);
    console.log(`Updated ring data:`, ringData);

    // Update the ring data with improved error handling and validation
    console.log(`About to update ring with data:`, ringData);
    console.log(`Ring before update:`, this.ring);
    console.log(`Ring system before update:`, this.ring.system);

    try {
      let updateResult;

      // Determine the correct update method based on ring ownership
      if (this.ring.parent === this.actor) {
        // Ring is owned by actor, update through actor (embedded document)
        console.log(`Updating ring through actor (embedded document)...`);

        const embeddedUpdateData = {
          _id: this.ring.id,
          [`system.flags.${MODULE_ID}`]: ringData
        };

        console.log(`Embedded update data:`, embeddedUpdateData);
        updateResult = await this.actor.updateEmbeddedDocuments('Item', [embeddedUpdateData]);
        console.log(`Embedded update result:`, updateResult);
      } else {
        // Ring is a world item, update directly
        console.log(`Updating ring directly (world item)...`);
        const updateData = {
          [`system.flags.${MODULE_ID}`]: ringData
        };
        updateResult = await this.ring.update(updateData);
        console.log(`Direct update result:`, updateResult);
      }

      // Verify the update was successful
      if (!updateResult) {
        throw new Error('Update operation returned null or undefined');
      }

      // Get fresh ring data and verify the spell was stored
      const freshRing = this.actor.items.get(this.ring.id) || game.items.get(this.ring.id);
      if (!freshRing) {
        throw new Error('Could not retrieve updated ring item');
      }

      const freshRingData = freshRing.system.flags?.[MODULE_ID];
      if (!freshRingData || !freshRingData.storedSpells) {
        throw new Error('Ring data structure is invalid after update');
      }

      console.log(`Fresh ring flags:`, freshRing.system.flags);
      console.log(`Fresh ring stored spells:`, freshRingData.storedSpells);
      console.log(`Fresh ring spell count: ${freshRingData.storedSpells.length}`);

      // Verify our spell was actually added
      const spellFound = freshRingData.storedSpells.some(s =>
        s.name === spellData.name &&
        s.level === spellData.level &&
        s.originalCaster.id === spellData.originalCaster.id
      );

      if (!spellFound) {
        throw new Error('Spell was not found in ring after update - storage may have failed');
      }

      // Update our reference
      this.ring = freshRing;

    } catch (error) {
      console.error(`Ring update failed:`, error);
      ui.notifications.error(`Failed to store spell: ${error.message}`);

      // Restore consumed spell slot if update failed
      if (consumed) {
        console.log('Attempting to restore consumed spell slot due to update failure...');
        try {
          await this.restoreSpellSlot(casterActor, level, spellType);
        } catch (restoreError) {
          console.error('Failed to restore spell slot:', restoreError);
        }
      }

      return false;
    }

    ui.notifications.info(
      game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellStored', {
        spell: spell.name,
        level: level,
        caster: casterActor.name
      })
    );

    // Force a complete re-render of the interface
    console.log(`Forcing interface re-render`);
    this.render(true);
    return true;
  }

  /**
   * Consume a spell slot from the actor
   */
  async consumeSpellSlot(actor, level, spellType) {
    const spellcasting = actor.system.spells;

    if (spellType === 'pact' && spellcasting.pact) {
      // Consume pact magic slot
      if (spellcasting.pact.value > 0) {
        const newValue = spellcasting.pact.value - 1;
        await actor.update({
          'system.spells.pact.value': newValue
        });
        console.log(`Consumed pact slot: ${spellcasting.pact.value} -> ${newValue}`);
        return true;
      }
      console.log(`No pact slots available: ${spellcasting.pact.value}`);
      return false;
    } else {
      // Consume regular spell slot
      const slotKey = `spell${level}`;
      const slotData = spellcasting[slotKey];

      if (slotData && slotData.value > 0) {
        const newValue = slotData.value - 1;
        await actor.update({
          [`system.spells.${slotKey}.value`]: newValue
        });
        console.log(`Consumed ${slotKey} slot: ${slotData.value} -> ${newValue}`);
        return true;
      }
      console.log(`No ${slotKey} slots available: ${slotData?.value || 0}`);
      return false;
    }
  }

  /**
   * Restore a spell slot to the actor (used when spell storage fails)
   */
  async restoreSpellSlot(actor, level, spellType) {
    const spellcasting = actor.system.spells;

    if (spellType === 'pact' && spellcasting.pact) {
      // Restore pact magic slot
      const newValue = Math.min(spellcasting.pact.value + 1, spellcasting.pact.max);
      await actor.update({
        'system.spells.pact.value': newValue
      });
      console.log(`Restored pact slot: ${spellcasting.pact.value} -> ${newValue}`);
      return true;
    } else {
      // Restore regular spell slot
      const slotKey = `spell${level}`;
      const slotData = spellcasting[slotKey];

      if (slotData) {
        const newValue = Math.min(slotData.value + 1, slotData.max);
        await actor.update({
          [`system.spells.${slotKey}.value`]: newValue
        });
        console.log(`Restored ${slotKey} slot: ${slotData.value} -> ${newValue}`);
        return true;
      }
      return false;
    }
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
    // Get fresh ring data
    const freshRing = this.actor.items.get(this.ring.id) || game.items.get(this.ring.id) || this.ring;
    const ringData = freshRing.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) {
      ui.notifications.error('Spell not found in ring.');
      return false;
    }

    console.log(`Casting spell: ${spellData.name} at level ${spellData.level}`);

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

    try {
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

      // Remove spell from ring after successful cast
      ringData.storedSpells.splice(spellIndex, 1);

      // Update ring with improved error handling
      if (freshRing.parent === this.actor) {
        await this.actor.updateEmbeddedDocuments('Item', [{
          _id: freshRing.id,
          [`system.flags.${MODULE_ID}`]: ringData
        }]);
      } else {
        await freshRing.update({
          [`system.flags.${MODULE_ID}`]: ringData
        });
      }

      // Update our reference
      this.ring = this.actor.items.get(this.ring.id) || game.items.get(this.ring.id) || freshRing;

      ui.notifications.info(
        game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellCast', {
          spell: spellData.name
        })
      );

      // Force a complete re-render of the interface
      this.render(true);
      return true;

    } catch (error) {
      console.error('Failed to cast spell from ring:', error);
      ui.notifications.error(`Failed to cast spell: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove a spell from the ring
   */
  async removeSpell(spellIndex) {
    // Get fresh ring data
    const freshRing = this.actor.items.get(this.ring.id) || game.items.get(this.ring.id) || this.ring;
    const ringData = freshRing.system.flags?.[MODULE_ID] || { storedSpells: [] };
    const spellData = ringData.storedSpells[spellIndex];

    if (!spellData) {
      ui.notifications.error('Spell not found in ring.');
      return false;
    }

    console.log(`Removing spell: ${spellData.name} at level ${spellData.level}`);

    try {
      // Remove spell from array
      ringData.storedSpells.splice(spellIndex, 1);

      // Update ring with improved error handling
      if (freshRing.parent === this.actor) {
        await this.actor.updateEmbeddedDocuments('Item', [{
          _id: freshRing.id,
          [`system.flags.${MODULE_ID}`]: ringData
        }]);
      } else {
        await freshRing.update({
          [`system.flags.${MODULE_ID}`]: ringData
        });
      }

      // Update our reference
      this.ring = this.actor.items.get(this.ring.id) || game.items.get(this.ring.id) || freshRing;

      ui.notifications.info(
        game.i18n.format('RING_OF_SPELL_STORING.Notifications.SpellRemoved', {
          spell: spellData.name
        })
      );

      // Force a complete re-render of the interface
      this.render(true);
      return true;

    } catch (error) {
      console.error('Failed to remove spell from ring:', error);
      ui.notifications.error(`Failed to remove spell: ${error.message}`);
      return false;
    }
  }
}
