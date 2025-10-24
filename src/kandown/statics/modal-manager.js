/**
 * Modal Management Utility
 * Provides consistent modal creation and management across the application
 */

export class ModalManager {
  static activeModal = null;

  /**
   * Creates a standard modal with consistent styling
   * @param {string} id - Modal ID
   * @param {string} title - Modal title
   * @param {string} content - Modal content HTML
   * @param {Object} options - Modal options
   * @returns {HTMLElement}
   */
  static createModal(id, title, content, options = {}) {
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
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
          if (options.onCancel) {
            options.onCancel();
          }
        }
      };
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
   * Shows a modal
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
   * Closes a specific modal
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
   * Closes the currently active modal
   */
  static closeActiveModal() {
    if (this.activeModal) {
      this.closeModal(this.activeModal);
    }
  }
}
