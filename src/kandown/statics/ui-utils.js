/**
 * UI Utility Functions
 * Provides reusable utility functions for common UI patterns
 */

/**
 * Creates an element with the specified tag and className
 * @param {string} tag - HTML tag name
 * @param {string} [className] - CSS class name(s)
 * @param {Object} [attributes] - Additional attributes to set
 * @returns {HTMLElement}
 */
export function createElement(tag, className = '', attributes = {}) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
}

/**
 * Creates a button with consistent properties
 * @param {Object} config - Button configuration
 * @param {string} config.className - CSS class name(s)
 * @param {string} [config.title] - Button title (tooltip)
 * @param {string} [config.text] - Button text content
 * @param {string} [config.innerHTML] - Button HTML content
 * @param {Function} [config.onClick] - Click handler
 * @param {Object} [config.attributes] - Additional attributes
 * @returns {HTMLButtonElement}
 */
export function createButton(config) {
  const button = createElement('button', config.className, config.attributes || {});
  
  if (config.title) {
    button.title = config.title;
  }
  
  if (config.innerHTML) {
    button.innerHTML = config.innerHTML;
  } else if (config.text) {
    button.textContent = config.text;
  }
  
  if (config.onClick) {
    button.onclick = config.onClick;
  }
  
  return button;
}

/**
 * Creates a span element with consistent properties
 * @param {Object} config - Span configuration
 * @param {string} config.className - CSS class name(s)
 * @param {string} [config.title] - Span title (tooltip)
 * @param {string} [config.text] - Span text content
 * @param {string} [config.innerHTML] - Span HTML content
 * @param {Function} [config.onClick] - Click handler
 * @param {Object} [config.attributes] - Additional attributes
 * @returns {HTMLSpanElement}
 */
export function createSpan(config) {
  const span = createElement('span', config.className, config.attributes || {});
  
  if (config.title) {
    span.title = config.title;
  }
  
  if (config.innerHTML) {
    span.innerHTML = config.innerHTML;
  } else if (config.text) {
    span.textContent = config.text;
  }
  
  if (config.onClick) {
    span.onclick = config.onClick;
  }
  
  return span;
}

/**
 * Creates an input element with consistent properties
 * @param {Object} config - Input configuration
 * @param {string} config.type - Input type (text, checkbox, etc.)
 * @param {string} [config.className] - CSS class name(s)
 * @param {string} [config.placeholder] - Input placeholder
 * @param {string} [config.value] - Input value
 * @param {Function} [config.onFocus] - Focus handler
 * @param {Function} [config.onBlur] - Blur handler
 * @param {Function} [config.onInput] - Input handler
 * @param {Function} [config.onKeyDown] - KeyDown handler
 * @param {Object} [config.attributes] - Additional attributes
 * @returns {HTMLInputElement}
 */
export function createInput(config) {
  const input = createElement('input', config.className || '', config.attributes || {});
  input.type = config.type;
  
  if (config.placeholder) {
    input.placeholder = config.placeholder;
  }
  
  if (config.value !== undefined) {
    input.value = config.value;
  }
  
  if (config.onFocus) {
    input.onfocus = config.onFocus;
  }
  
  if (config.onBlur) {
    input.onblur = config.onBlur;
  }
  
  if (config.onInput) {
    input.oninput = config.onInput;
  }
  
  if (config.onKeyDown) {
    input.onkeydown = config.onKeyDown;
  }
  
  return input;
}

/**
 * Creates a div element with children
 * @param {string} className - CSS class name(s)
 * @param {Array<HTMLElement>} [children] - Child elements to append
 * @param {Object} [attributes] - Additional attributes
 * @returns {HTMLDivElement}
 */
export function createDiv(className = '', children = [], attributes = {}) {
  const div = createElement('div', className, attributes);
  children.forEach(child => {
    if (child) {
      div.appendChild(child);
    }
  });
  return div;
}
