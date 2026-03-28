/**
 * Modal Management Utility
 * Provides consistent modal creation and management across the application.
 *
 * Supports two kinds of modals:
 *  1. **Dynamic modals** – created via {@link ModalManager.createModal} and
 *     appended/removed from the DOM automatically.
 *  2. **Static (HTML-defined) modals** – already present in the markup and
 *     toggled via {@link ModalManager.openStatic} / {@link ModalManager.closeStatic}.
 *
 * Both kinds share backdrop-click-to-close and Escape-key-to-close behaviour.
 */

export class ModalManager {
  /** @type {HTMLElement|null} Currently visible dynamic modal */
  static activeModal = null;

  /**
   * @type {Map<string, {element: HTMLElement, onClose: Function|null}>}
   * Registry for static (HTML-defined) modals.
   */
  static _staticModals = new Map();

  /** Whether the global keyboard listener has been installed */
  static _keyListenerInstalled = false;

  // ---------------------------------------------------------------------------
  // Global keyboard handler (shared by all modals)
  // ---------------------------------------------------------------------------

  /** Installs a single document-level keydown listener for Escape */
  static _installKeyListener() {
    if (this._keyListenerInstalled) return;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._handleEscape();
      }
    });
    this._keyListenerInstalled = true;
  }

  /** @private */
  static _handleEscape() {
    // Dynamic modal takes priority
    if (this.activeModal) {
      this.closeActiveModal();
      return;
    }
    // Otherwise close any open static modal (most recently opened first)
    for (const [id, entry] of [...this._staticModals.entries()].reverse()) {
      if (entry.element.style.display !== 'none') {
        this.closeStatic(id);
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Static (HTML-defined) modal helpers
  // ---------------------------------------------------------------------------

  /**
   * Register a pre-existing modal element so ModalManager can manage it.
   *
   * This wires up:
   * - Backdrop click to close
   * - Any element with class `close-btn` inside the modal
   * - Escape key (via the shared listener)
   *
   * @param {string}   id        - A unique key (typically the element's DOM id)
   * @param {HTMLElement} element - The modal DOM element
   * @param {Object}  [options]
   * @param {Function} [options.onClose]  - Called every time the modal is closed
   * @param {Function} [options.onOpen]   - Called every time the modal is opened
   */
  static registerStatic(id, element, options = {}) {
    this._installKeyListener();

    const entry = { element, onClose: options.onClose || null, onOpen: options.onOpen || null };
    this._staticModals.set(id, entry);

    // Backdrop click
    element.addEventListener('click', (e) => {
      if (e.target === element) {
        this.closeStatic(id);
      }
    });

    // Close-btn inside the modal
    const closeBtn = element.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeStatic(id));
    }
  }

  /**
   * Open a registered static modal.
   * @param {string} id - The key used in {@link registerStatic}
   */
  static openStatic(id) {
    const entry = this._staticModals.get(id);
    if (!entry) {
      console.warn(`ModalManager: unknown static modal "${id}"`);
      return;
    }
    entry.element.style.display = 'block';
    if (entry.onOpen) entry.onOpen();
  }

  /**
   * Close a registered static modal.
   * @param {string} id - The key used in {@link registerStatic}
   */
  static closeStatic(id) {
    const entry = this._staticModals.get(id);
    if (!entry) return;
    entry.element.style.display = 'none';
    if (entry.onClose) entry.onClose();
  }

  // ---------------------------------------------------------------------------
  // Dynamic modal creation
  // ---------------------------------------------------------------------------

  /**
   * Creates a standard modal with consistent styling
   * @param {string} id - Modal ID
   * @param {string} title - Modal title
   * @param {string} content - Modal content HTML
   * @param {Object} options - Modal options
   * @returns {HTMLElement}
   */
  static createModal(id, title, content, options = {}) {
    this._installKeyListener();

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay';
    
    const box = document.createElement('div');
    box.className = 'modal-box';
    
    // Title
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    
    // Content
    const contentEl = document.createElement('p');
    contentEl.innerHTML = content;
    
    box.appendChild(titleEl);
    box.appendChild(contentEl);
    
    // Add action buttons if provided
    if (options.actions && options.actions.length > 0) {
      options.actions.forEach(action => {
        const btn = this.createButton(action);
        box.appendChild(btn);
      });
    }
    
    modal.appendChild(box);
    
    // Close on backdrop click if enabled
    if (options.closeOnBackdrop !== false) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
          if (options.onCancel) {
            options.onCancel();
          }
        }
      });
    }
    
    return modal;
  }

  /**
   * Creates a confirmation modal
   * @param {string} title
   * @param {string} message  
   * @param {Function} onConfirm
   * @param {Function} onCancel
   * @returns {HTMLElement}
   */
  static createConfirmModal(title, message, onConfirm, onCancel = null) {
    return this.createModal('confirm-modal', title, message, {
      actions: [
        {
          text: 'Delete',
          className: 'modal-btn modal-btn-confirm',
          onClick: () => {
            onConfirm();
            this.closeActiveModal();
          }
        },
        {
          text: 'Cancel', 
          className: 'modal-btn modal-btn-cancel',
          onClick: () => {
            if (onCancel) onCancel();
            this.closeActiveModal();
          }
        }
      ],
      onCancel: onCancel
    });
  }

  /**
   * Creates a button with consistent styling
   * @param {Object} config - Button configuration
   * @returns {HTMLElement}
   */
  static createButton(config) {
    const btn = document.createElement('button');
    btn.className = config.className || 'modal-btn';
    btn.textContent = config.text;
    btn.onclick = config.onClick;
    return btn;
  }

  /**
   * Shows a dynamic modal
   * @param {HTMLElement} modal
   */
  static showModal(modal) {
    if (this.activeModal) {
      this.closeActiveModal();
    }
    
    document.body.appendChild(modal);
    this.activeModal = modal;
  }

  /**
   * Closes a specific dynamic modal
   * @param {HTMLElement} modal
   */
  static closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    if (this.activeModal === modal) {
      this.activeModal = null;
    }
  }

  /**
   * Closes the currently active dynamic modal
   */
  static closeActiveModal() {
    if (this.activeModal) {
      this.closeModal(this.activeModal);
    }
  }
}
