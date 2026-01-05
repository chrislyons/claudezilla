/**
 * Claudezilla Content Script
 *
 * Runs in web pages and handles DOM interaction commands.
 * Includes devtools features: console capture, scroll, wait, evaluate.
 */

// Console log capture
const capturedLogs = [];
const MAX_LOGS = 500;

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

function captureLog(level, args) {
  const entry = {
    level,
    timestamp: Date.now(),
    message: args.map(arg => {
      try {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      } catch (e) {
        return '[Unserializable]';
      }
    }).join(' '),
  };
  capturedLogs.push(entry);
  if (capturedLogs.length > MAX_LOGS) {
    capturedLogs.shift();
  }
}

// Override console methods
console.log = (...args) => { captureLog('log', args); originalConsole.log(...args); };
console.warn = (...args) => { captureLog('warn', args); originalConsole.warn(...args); };
console.error = (...args) => { captureLog('error', args); originalConsole.error(...args); };
console.info = (...args) => { captureLog('info', args); originalConsole.info(...args); };
console.debug = (...args) => { captureLog('debug', args); originalConsole.debug(...args); };

// Capture uncaught errors
window.addEventListener('error', (event) => {
  captureLog('error', [`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
});

window.addEventListener('unhandledrejection', (event) => {
  captureLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
});

/**
 * Get captured console logs
 * @param {object} params - Parameters
 * @param {string} params.level - Filter by level (log, warn, error, info, debug)
 * @param {boolean} params.clear - Clear logs after returning
 * @param {number} params.limit - Max logs to return (default 100)
 * @returns {object} Console logs
 */
function getConsoleLogs(params = {}) {
  const { level, clear = false, limit = 100 } = params;

  let logs = [...capturedLogs];

  if (level) {
    logs = logs.filter(log => log.level === level);
  }

  logs = logs.slice(-limit);

  if (clear) {
    capturedLogs.length = 0;
  }

  return {
    logs,
    total: capturedLogs.length,
    filtered: logs.length,
  };
}

/**
 * Scroll to element or position
 * @param {object} params - Parameters
 * @param {string} params.selector - CSS selector to scroll to
 * @param {number} params.x - X position to scroll to
 * @param {number} params.y - Y position to scroll to
 * @param {string} params.behavior - 'smooth' or 'instant' (default: smooth)
 * @returns {object} Result
 */
function scroll(params = {}) {
  const { selector, x, y, behavior = 'smooth' } = params;

  if (selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    element.scrollIntoView({ behavior, block: 'center' });
    const rect = element.getBoundingClientRect();
    return {
      selector,
      scrolledTo: true,
      elementPosition: { x: rect.x, y: rect.y },
    };
  }

  if (x !== undefined || y !== undefined) {
    window.scrollTo({
      left: x ?? window.scrollX,
      top: y ?? window.scrollY,
      behavior,
    });
    return {
      scrolledTo: true,
      position: { x: window.scrollX, y: window.scrollY },
    };
  }

  // Return current scroll position
  return {
    position: { x: window.scrollX, y: window.scrollY },
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  };
}

/**
 * Wait for element to appear
 * @param {object} params - Parameters
 * @param {string} params.selector - CSS selector to wait for
 * @param {number} params.timeout - Timeout in ms (default: 10000)
 * @param {number} params.interval - Poll interval in ms (default: 100)
 * @returns {Promise<object>} Result
 */
async function waitFor(params) {
  const { selector, timeout = 10000, interval = 100 } = params;

  if (!selector) {
    throw new Error('selector is required');
  }

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      return {
        selector,
        found: true,
        elapsed: Date.now() - startTime,
        visible: rect.width > 0 && rect.height > 0,
        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for element: ${selector}`);
}

/**
 * Evaluate JavaScript in page context
 * @param {object} params - Parameters
 * @param {string} params.expression - JavaScript expression to evaluate
 * @returns {object} Result
 */
function evaluate(params) {
  const { expression } = params;

  if (!expression) {
    throw new Error('expression is required');
  }

  try {
    // Use Function constructor for safer eval
    const result = new Function(`return (${expression})`)();

    // Serialize result
    let serialized;
    try {
      serialized = JSON.parse(JSON.stringify(result));
    } catch (e) {
      serialized = String(result);
    }

    return {
      expression,
      result: serialized,
      type: typeof result,
    };
  } catch (error) {
    return {
      expression,
      error: error.message,
      type: 'error',
    };
  }
}

/**
 * Get element info (attributes, styles, visibility)
 * @param {object} params - Parameters
 * @param {string} params.selector - CSS selector
 * @returns {object} Element info
 */
function getElementInfo(params) {
  const { selector } = params;

  if (!selector) {
    throw new Error('selector is required');
  }

  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  // Get all attributes
  const attributes = {};
  for (const attr of element.attributes) {
    attributes[attr.name] = attr.value;
  }

  return {
    selector,
    tagName: element.tagName.toLowerCase(),
    attributes,
    text: element.textContent?.trim().slice(0, 500),
    visible: rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden',
    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    styles: {
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
    },
  };
}

/**
 * Get page content
 * @param {object} params - Parameters
 * @param {string} params.selector - Optional CSS selector to get specific element
 * @returns {object} Page content
 */
function getContent(params = {}) {
  const { selector } = params;

  if (selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return {
      selector,
      text: element.textContent?.trim(),
      html: element.innerHTML,
      tagName: element.tagName.toLowerCase(),
    };
  }

  return {
    url: window.location.href,
    title: document.title,
    text: document.body?.textContent?.trim(),
    html: document.documentElement.outerHTML,
  };
}

/**
 * Click an element
 * @param {object} params - Parameters
 * @param {string} params.selector - CSS selector for element to click
 * @returns {object} Result
 */
function click(params) {
  const { selector } = params;

  if (!selector) {
    throw new Error('selector is required');
  }

  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  // Scroll element into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Simulate click
  element.click();

  return {
    selector,
    clicked: true,
    tagName: element.tagName.toLowerCase(),
  };
}

/**
 * Type text into an input element
 * @param {object} params - Parameters
 * @param {string} params.selector - CSS selector for input element
 * @param {string} params.text - Text to type
 * @param {boolean} params.clear - Whether to clear existing value first
 * @returns {object} Result
 */
function type(params) {
  const { selector, text, clear = true } = params;

  if (!selector) {
    throw new Error('selector is required');
  }

  if (text === undefined) {
    throw new Error('text is required');
  }

  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  // Check if element is an input or textarea
  const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
  const isContentEditable = element.isContentEditable;

  if (!isInput && !isContentEditable) {
    throw new Error(`Element is not editable: ${selector}`);
  }

  // Focus the element
  element.focus();

  if (isInput) {
    if (clear) {
      element.value = '';
    }
    element.value += text;

    // Dispatch input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (isContentEditable) {
    if (clear) {
      element.textContent = '';
    }
    element.textContent += text;

    // Dispatch input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  return {
    selector,
    typed: text,
    currentValue: isInput ? element.value : element.textContent,
  };
}

/**
 * Get structured page state (fast alternative to screenshots)
 * @returns {object} Page state
 */
function getPageState() {
  const state = {
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
    },
    errors: capturedLogs.filter(l => l.level === 'error').slice(-10).map(l => l.message),
    headings: [],
    links: [],
    buttons: [],
    inputs: [],
    images: [],
    landmarks: [],
  };

  // Headings
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
    const text = el.textContent?.trim();
    if (text) {
      state.headings.push({ level: el.tagName.toLowerCase(), text: text.slice(0, 100) });
    }
  });

  // Links (visible, with text)
  document.querySelectorAll('a[href]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const text = el.textContent?.trim() || el.getAttribute('aria-label') || '';
      if (text) {
        state.links.push({
          text: text.slice(0, 50),
          href: el.getAttribute('href')?.slice(0, 100),
        });
      }
    }
  });
  state.links = state.links.slice(0, 30);

  // Buttons
  document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      state.buttons.push({
        text: (el.textContent?.trim() || el.value || el.getAttribute('aria-label') || '').slice(0, 50),
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
        type: el.type || 'button',
      });
    }
  });
  state.buttons = state.buttons.slice(0, 20);

  // Form inputs
  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'hidden') return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      state.inputs.push({
        type: el.type || el.tagName.toLowerCase(),
        name: el.name || el.id || '',
        label: el.getAttribute('aria-label') || el.placeholder || document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || '',
        value: el.type === 'password' ? '***' : (el.value?.slice(0, 50) || ''),
        required: el.required,
        disabled: el.disabled,
      });
    }
  });
  state.inputs = state.inputs.slice(0, 20);

  // Images with alt text
  document.querySelectorAll('img[alt]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width > 20 && rect.height > 20) {
      state.images.push({
        alt: el.alt.slice(0, 100),
        src: el.src?.slice(0, 100),
      });
    }
  });
  state.images = state.images.slice(0, 15);

  // ARIA landmarks
  document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="search"], [role="form"], main, nav, header, footer, aside').forEach(el => {
    state.landmarks.push({
      role: el.getAttribute('role') || el.tagName.toLowerCase(),
      label: el.getAttribute('aria-label') || '',
    });
  });

  return state;
}

/**
 * Get accessibility tree snapshot
 * @param {object} params - Parameters
 * @param {number} params.maxDepth - Max tree depth (default: 5)
 * @param {string} params.selector - Root element selector (default: body)
 * @returns {object} Accessibility tree
 */
function getAccessibilitySnapshot(params = {}) {
  const { maxDepth = 5, selector = 'body' } = params;
  const root = document.querySelector(selector);
  if (!root) throw new Error(`Element not found: ${selector}`);

  function getAccessibleName(el) {
    return el.getAttribute('aria-label') ||
           el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent?.trim() ||
           el.getAttribute('title') ||
           el.getAttribute('alt') ||
           (el.tagName === 'INPUT' && el.placeholder) ||
           (el.tagName === 'IMG' && el.alt) ||
           (el.labels?.[0]?.textContent?.trim()) ||
           '';
  }

  function getRole(el) {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;

    // Implicit roles
    const tag = el.tagName.toLowerCase();
    const roleMap = {
      'a': el.href ? 'link' : null,
      'button': 'button',
      'input': el.type === 'checkbox' ? 'checkbox' : el.type === 'radio' ? 'radio' : el.type === 'submit' ? 'button' : 'textbox',
      'select': 'combobox',
      'textarea': 'textbox',
      'img': 'img',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary',
      'form': 'form',
      'table': 'table',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
    };
    return roleMap[tag] || null;
  }

  function walkTree(el, depth = 0) {
    if (depth > maxDepth) return null;

    const rect = el.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 &&
                      window.getComputedStyle(el).display !== 'none' &&
                      window.getComputedStyle(el).visibility !== 'hidden';

    if (!isVisible && el !== root) return null;

    const role = getRole(el);
    const name = getAccessibleName(el);
    const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
                 ? el.textContent?.trim().slice(0, 100)
                 : '';

    // Skip non-semantic elements without accessible info
    if (!role && !name && !text && el.tagName.match(/^(DIV|SPAN|P)$/i)) {
      // But still process children
      const children = [];
      for (const child of el.children) {
        const node = walkTree(child, depth);
        if (node) children.push(node);
      }
      return children.length === 1 ? children[0] : (children.length > 1 ? { children } : null);
    }

    const node = {};
    if (role) node.role = role;
    if (name) node.name = name;
    if (text) node.text = text;

    // State
    if (el.disabled) node.disabled = true;
    if (el.checked) node.checked = true;
    if (el.getAttribute('aria-expanded')) node.expanded = el.getAttribute('aria-expanded') === 'true';
    if (el.getAttribute('aria-selected')) node.selected = el.getAttribute('aria-selected') === 'true';
    if (el.value && el.tagName.match(/^(INPUT|TEXTAREA|SELECT)$/i) && el.type !== 'password') {
      node.value = el.value.slice(0, 50);
    }

    // Children
    const children = [];
    for (const child of el.children) {
      const childNode = walkTree(child, depth + 1);
      if (childNode) {
        if (Array.isArray(childNode)) {
          children.push(...childNode);
        } else {
          children.push(childNode);
        }
      }
    }
    if (children.length > 0) node.children = children.slice(0, 50);

    return Object.keys(node).length > 0 ? node : null;
  }

  return {
    url: window.location.href,
    title: document.title,
    tree: walkTree(root),
  };
}

/**
 * Handle messages from background script
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, params } = message;

  // Handle async actions
  (async () => {
    try {
      let result;

      switch (action) {
        case 'getContent':
          result = getContent(params);
          break;

        case 'click':
          result = click(params);
          break;

        case 'type':
          result = type(params);
          break;

        case 'getConsoleLogs':
          result = getConsoleLogs(params);
          break;

        case 'scroll':
          result = scroll(params);
          break;

        case 'waitFor':
          result = await waitFor(params);
          break;

        case 'evaluate':
          result = evaluate(params);
          break;

        case 'getElementInfo':
          result = getElementInfo(params);
          break;

        case 'getPageState':
          result = getPageState();
          break;

        case 'getAccessibilitySnapshot':
          result = getAccessibilitySnapshot(params);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      sendResponse({ success: true, result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});
