/**
 * Test setup for Ring of Spell Storing module
 * Mocks Foundry VTT environment for unit testing
 */

// Mock Foundry VTT globals
global.game = {
  settings: {
    get: jest.fn(),
    set: jest.fn(),
    register: jest.fn()
  },
  i18n: {
    localize: jest.fn((key) => key),
    format: jest.fn((key, data) => `${key}: ${JSON.stringify(data)}`)
  },
  actors: {
    filter: jest.fn(() => []),
    get: jest.fn()
  },
  items: {
    get: jest.fn()
  },
  user: {
    isGM: false
  }
};

global.ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

global.CONFIG = {};
global.CONST = {};
global.foundry = {};
global.Hooks = {
  on: jest.fn(),
  once: jest.fn(),
  call: jest.fn(),
  callAll: jest.fn()
};

global.Application = class MockApplication {
  constructor(options = {}) {
    this.options = options;
  }

  render(_force = false) {
    return this;
  }

  close() {
    return Promise.resolve();
  }

  getData() {
    return {};
  }

  activateListeners(_html) {}
};

global.Dialog = class MockDialog extends global.Application {
  constructor(data, options = {}) {
    super(options);
    this.data = data;
  }
};

global.FormApplication = class MockFormApplication extends global.Application {};

global.Actor = class MockActor {
  constructor(data = {}) {
    this.id = data.id || 'test-actor-id';
    this.name = data.name || 'Test Actor';
    this.system = data.system || {};
    this.items = data.items || new global.MockCollection();
    this.isOwner = data.isOwner !== undefined ? data.isOwner : true;
  }

  updateEmbeddedDocuments(type, updates) {
    return Promise.resolve(updates);
  }

  update(_data) {
    return Promise.resolve(this);
  }
};

global.Item = class MockItem {
  constructor(data = {}) {
    this.id = data.id || 'test-item-id';
    this.name = data.name || 'Test Item';
    this.type = data.type || 'equipment';
    this.system = data.system || { flags: {} };
    this.parent = data.parent || null;
  }

  update(data) {
    // Simulate Foundry's update behavior
    Object.keys(data).forEach(key => {
      if (key.startsWith('system.flags.')) {
        const flagPath = key.replace('system.flags.', '');
        if (!this.system.flags) {
          this.system.flags = {};
        }
        this.system.flags[flagPath] = data[key];
      }
    });
    return Promise.resolve(this);
  }

  setFlag(scope, key, value) {
    if (!this.system.flags) {
      this.system.flags = {};
    }
    if (!this.system.flags[scope]) {
      this.system.flags[scope] = {};
    }
    this.system.flags[scope][key] = value;
    return Promise.resolve(this);
  }

  getFlag(scope, key) {
    return this.system.flags?.[scope]?.[key];
  }
};

global.MockCollection = class MockCollection extends Array {
  get(id) {
    return this.find(item => item.id === id);
  }

  filter(fn) {
    return super.filter(fn);
  }

  some(fn) {
    return super.some(fn);
  }
};

// Mock jQuery
global.$ = jest.fn(() => ({
  find: jest.fn(() => ({
    click: jest.fn(),
    val: jest.fn(),
    html: jest.fn(),
    on: jest.fn(),
    data: jest.fn()
  })),
  click: jest.fn(),
  val: jest.fn(),
  html: jest.fn(),
  on: jest.fn(),
  data: jest.fn()
}));

// Mock renderTemplate
global.renderTemplate = jest.fn(() => Promise.resolve('<div>Mock Template</div>'));

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Export constants for tests
module.exports = {
  MODULE_ID: 'ring-of-spell-storing',
  MAX_SPELL_LEVELS: 5
};
