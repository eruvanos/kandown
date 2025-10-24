/**
 * Task Component Renderer
 * Breaks down the monolithic renderTasks function into focused components
 */

class TaskRenderer {
  constructor(columns, taskAPI) {
    this.columns = columns;
    this.taskAPI = taskAPI;
  }

  /**
   * Renders all tasks to their respective columns
   * @param {Task[]} tasks 
   * @param {Function} focusCallback 
   * @param {string} focusTaskId 
   */
  renderTasks(tasks, focusCallback, focusTaskId) {
    // Clear existing tasks
    Object.values(this.columns).forEach(col => {
      while (col.children.length > 1) {
        col.removeChild(col.lastChild);
      }
    });

    // Sort and render tasks
    tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    tasks.forEach(task => {
      const taskElement = this.createTaskElement(task, focusTaskId);
      this.columns[task.status].appendChild(taskElement);
    });

    // Setup drag and drop
    this.makeDraggable();
    
    if (focusCallback) focusCallback();
  }

  /**
   * Creates a complete task element
   * @param {Task} task 
   * @param {string} focusTaskId 
   * @returns {HTMLElement}
   */
  createTaskElement(task, focusTaskId) {
    const el = document.createElement('div');
    el.className = 'task';
    el.dataset.id = task.id;
    el.dataset.order = task.order?.toString() || '0';

    // Handle collapsed state for done tasks
    if (task.status === 'done' && this.isDoneTaskCollapsed(task.id)) {
      return this.createCollapsedTask(task, el);
    }

    // Build task components
    el.appendChild(this.createTaskHeader(task));
    el.appendChild(this.createTaskContent(task, focusTaskId));
    el.appendChild(this.createTaskTags(task));
    
    // Add metadata components
    this.addTaskMetadata(el, task);
    this.addTaskControls(el, task);

    return el;
  }

  /**
   * Creates the task header with type, ID, and delete button
   * @param {Task} task 
   * @returns {HTMLElement}
   */
  createTaskHeader(task) {
    const header = document.createElement('div');
    header.className = 'task-header';

    header.appendChild(this.createTypeButton(task));
    header.appendChild(this.createTaskId(task));
    header.appendChild(this.createDeleteButton(task));

    return header;
  }

  /**
   * Creates the type selection button with dropdown
   * @param {Task} task 
   * @returns {HTMLElement}
   */
  createTypeButton(task) {
    const typeMap = {
      chore: { icon: '⚙️', label: 'chore' },
      feature: { icon: '⭐️', label: 'feature' },
      epic: { icon: '🚀', label: 'epic' },
      bug: { icon: '🐞', label: 'bug' },
      request: { icon: '🗣️', label: 'request' },
      experiment: { icon: '🧪', label: 'experiment' },
    };

    const typeInfo = typeMap[task.type] || { icon: '', label: task.type || '' };
    
    const typeBtn = document.createElement('button');
    typeBtn.className = 'task-type-btn';
    typeBtn.title = typeInfo.label;
    typeBtn.innerHTML = `<span class="task-type-icon">${typeInfo.icon}</span>`;

    const dropdown = this.createTypeDropdown(task, typeMap);
    
    // Setup dropdown behavior
    this.setupDropdownBehavior(typeBtn, dropdown);

    const container = document.createElement('div');
    container.className = 'task-type-container';
    container.appendChild(typeBtn);
    container.appendChild(dropdown);

    return container;
  }

  /**
   * Creates the type selection dropdown
   * @param {Task} task 
   * @param {Object} typeMap 
   * @returns {HTMLElement}
   */
  createTypeDropdown(task, typeMap) {
    const dropdown = document.createElement('div');
    dropdown.className = 'type-dropdown';

    Object.entries(typeMap).forEach(([key, { icon, label }]) => {
      const option = document.createElement('div');
      option.className = `type-option ${key === task.type ? 'type-option-selected' : ''}`;
      option.innerHTML = `<span class="type-icon">${icon}</span> ${label}`;
      
      option.onclick = (e) => {
        e.stopPropagation();
        this.handleTypeChange(task.id, key, dropdown);
      };
      
      dropdown.appendChild(option);
    });

    return dropdown;
  }

  /**
   * Creates the task ID display
   * @param {Task} task 
   * @returns {HTMLElement}
   */
  createTaskId(task) {
    const idDiv = document.createElement('div');
    idDiv.className = 'task-id';
    idDiv.textContent = task.id;
    return idDiv;
  }

  /**
   * Creates the delete button
   * @param {Task} task 
   * @returns {HTMLElement}
   */
  createDeleteButton(task) {
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-task-btn';
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = '&#10060;';
    
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.handleTaskDelete(task.id);
    };

    return deleteBtn;
  }

  /**
   * Creates the task content area (text/textarea)
   * @param {Task} task 
   * @param {string} focusTaskId 
   * @returns {HTMLElement}
   */
  createTaskContent(task, focusTaskId) {
    if (focusTaskId && task.id === focusTaskId && !task.text) {
      return this.createTaskEditor(task, '');
    }

    const textSpan = document.createElement('p');
    textSpan.className = 'task-text';
    
    if (!task.text) {
      textSpan.textContent = 'Click to add text';
      textSpan.classList.add('task-text-placeholder');
    } else {
      this.setTaskTextContent(textSpan, task.text);
    }

    // Make text editable on click
    textSpan.addEventListener('click', (e) => {
      if (this.shouldEnterEditMode(e)) {
        this.enterEditMode(textSpan, task);
      }
    });

    return textSpan;
  }

  /**
   * Sets the text content, rendering markdown if available
   * @param {HTMLElement} element 
   * @param {string} text 
   */
  setTaskTextContent(element, text) {
    if (window.marked) {
      element.innerHTML = window.marked.parse(text);
      // Setup checkbox handlers
      setTimeout(() => {
        element.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.addEventListener('click', this.handleCheckboxClick.bind(this));
        });
      }, 0);
    } else {
      element.textContent = text;
    }
  }

  /**
   * Event handlers and utility methods would continue...
   */

  // Additional methods for tags, metadata, controls, etc.
  // This demonstrates the structure for breaking down the large function
}

export { TaskRenderer };