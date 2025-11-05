/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} text
 * @property {string} status
 * @property {string[]} tags
 * @property {number} [order]
 * @property {string} [closed_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} Columns
 * @property {HTMLElement} todo
 * @property {HTMLElement} in_progress
 * @property {HTMLElement} done
 */

/**
 * Server mode type
 * page-local: page mode using localStorage
 * page-fs: page mode using File System Access API
 * readOnly: viewing external backlog file (no modifications allowed)
 * cli: connected to Kandown CLI server
 *
 * @typedef {'cli'|'page-local'|'page-fs'|'readOnly'|'unknown'} ServerMode
 */

/**
 * @typedef {Object} SettingsAPI
 * @property {Function} getSettings - Function to get settings
 * @property {Function} updateSettings - Function to update settings
 */

/**
 * @typedef {Object} TaskAPI
 * @property {Function} getTasks - Function to get tasks
 * @property {Function} addTask - Function to add a task
 * @property {Function} updateTask - Function to update a task
 * @property {Function} deleteTask - Function to delete a task
 */
