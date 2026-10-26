const { ComponentRegistry } = require('mailspring-exports');
const GeminiComposerButton = require('./gemini-composer-button');

module.exports = {
  activate() {
    ComponentRegistry.register(GeminiComposerButton, {
      role: 'Composer:ActionButton',
    });
  },

  serialize() {
    return {};
  },

  deactivate() {
    ComponentRegistry.unregister(GeminiComposerButton);
  },
};