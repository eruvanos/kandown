/**
 * EventManager - A utility class for managing event listeners with automatic cleanup
 * 
 * This class provides a cleaner pattern for managing event listeners, replacing
 * manual event listener cleanup logic scattered throughout the codebase.
 * 
 * @example
 * const eventManager = new EventManager();
 * eventManager.addListener(element, 'click', handler, 'my-click-handler');
 * // Later...
 * eventManager.removeListener('my-click-handler');
 * // Or cleanup everything
 * eventManager.cleanup();
 */
export class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Add an event listener and track it for later removal
     * @param {EventTarget} element - The element to attach the listener to
     * @param {string} event - The event type (e.g., 'click', 'mousedown')
     * @param {EventListener} handler - The event handler function
     * @param {string} id - A unique identifier for this listener
     */
    addListener(element, event, handler, id) {
        // Remove existing listener with the same id if it exists
        if (this.listeners.has(id)) {
            this.removeListener(id);
        }
        
        element.addEventListener(event, handler);
        this.listeners.set(id, { element, event, handler });
    }

    /**
     * Remove a specific event listener by its ID
     * @param {string} id - The unique identifier of the listener to remove
     * @returns {boolean} - True if the listener was removed, false if it didn't exist
     */
    removeListener(id) {
        const listener = this.listeners.get(id);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler);
            this.listeners.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Check if a listener with the given ID exists
     * @param {string} id - The unique identifier to check
     * @returns {boolean} - True if the listener exists
     */
    hasListener(id) {
        return this.listeners.has(id);
    }

    /**
     * Remove all tracked event listeners
     */
    cleanup() {
        this.listeners.forEach((listener, id) => {
            listener.element.removeEventListener(listener.event, listener.handler);
        });
        this.listeners.clear();
    }

    /**
     * Get the number of tracked listeners
     * @returns {number} - The number of active listeners
     */
    get size() {
        return this.listeners.size;
    }
}
