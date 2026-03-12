/**
 * Trigger Registry
 * 
 * Central registry for all trigger plugins.
 * Trigger plugins are registered at bootstrap time and retrieved by worker.
 * 
 * @module triggerRegistry
 */

import logger from '../../../shared/logger/logger.js';

/**
 * Internal registry (Map: triggerType → TriggerPlugin)
 * @type {Map<string, import('./TriggerPlugin.interface.js').TriggerPlugin>}
 */
const registry = new Map();

/**
 * Register a trigger plugin
 * 
 * @param {import('./TriggerPlugin.interface.js').TriggerPlugin} plugin
 * @throws {Error} If trigger type already registered
 */
export function register(plugin) {
  if (!plugin || !plugin.type) {
    throw new Error('Invalid trigger plugin: missing type property');
  }

  if (registry.has(plugin.type)) {
    throw new Error(`Trigger type "${plugin.type}" is already registered`);
  }

  registry.set(plugin.type, plugin);
  logger.info('Trigger registered', { triggerType: plugin.type });
}

/**
 * Get all registered triggers
 * 
 * @returns {import('./TriggerPlugin.interface.js').TriggerPlugin[]} Array of all trigger plugins
 */
export function getAll() {
  return Array.from(registry.values());
}

/**
 * Get a specific trigger by type
 * 
 * @param {string} type - Trigger type identifier
 * @returns {import('./TriggerPlugin.interface.js').TriggerPlugin|undefined} The trigger plugin or undefined
 */
export function get(type) {
  return registry.get(type);
}

/**
 * Check if a trigger type is registered
 * 
 * @param {string} type - Trigger type identifier
 * @returns {boolean} True if registered
 */
export function has(type) {
  return registry.has(type);
}

/**
 * Get all registered trigger types
 * 
 * @returns {string[]} Array of trigger type identifiers
 */
export function getAllTypes() {
  return Array.from(registry.keys());
}

/**
 * Clear all registered triggers (for testing only)
 * @internal
 */
export function clear() {
  registry.clear();
}
