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
 * Handle messages from background script
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, params } = message;

  // Use original console to avoid self-capture
  originalConsole.log('[claudezilla-content] Received:', action, params);

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

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      sendResponse({ success: true, result });
    } catch (error) {
      originalConsole.error('[claudezilla-content] Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep message channel open for async response
});

originalConsole.log('[claudezilla-content] Content script loaded on', window.location.href);
