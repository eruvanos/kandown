/**
 * Modal Management Utility
 * Replaces inline modal creation with reusable patterns
 */

class ModalManager {
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
    modal.className = 'modal modal-overlay';
    
    const box = document.createElement('div');
    box.className = 'modal-content';
    
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.closeModal(modal);
    
    // Title
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    
    // Content
    const contentEl = document.createElement('div');
    contentEl.innerHTML = content;
    
    box.appendChild(closeBtn);
    box.appendChild(titleEl);
    box.appendChild(contentEl);
    
    // Add action buttons if provided
    if (options.actions) {
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      
      options.actions.forEach(action => {
        const btn = this.createButton(action);
        actions.appendChild(btn);
      });
      
      box.appendChild(actions);
    }
    
    modal.appendChild(box);
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    };
    
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
  static createConfirmModal(title, message, onConfirm, onCancel) {
    return this.createModal('confirm-modal', title, `<p>${message}</p>`, {
      actions: [
        {
          text: 'Confirm',
          className: 'btn btn-danger',
          onClick: () => {
            onConfirm();
            this.closeActiveModal();
          }
        },
        {
          text: 'Cancel', 
          className: 'btn btn-secondary',
          onClick: () => {
            if (onCancel) onCancel();
            this.closeActiveModal();
          }
        }
      ]
    });
  }

  /**
   * Creates a button with consistent styling
   * @param {Object} config - Button configuration
   * @returns {HTMLElement}
   */
  static createButton(config) {
    const btn = document.createElement('button');
    btn.className = config.className || 'btn';
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
    modal.style.display = 'flex';
    this.activeModal = modal;
  }

  /**
   * Closes a specific modal
   * @param {HTMLElement} modal
   */
  static closeModal(modal) {
    modal.style.display = 'none';
    if (modal.parentNode) {
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

export { ModalManager };