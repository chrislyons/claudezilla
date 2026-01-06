/**
 * Email Capture for Claudezilla Homepage
 */

const WORKER_URL = 'https://api.claudezilla.com'; // Same as support.js

// State
let isExpanded = false;

// Elements (lazy init)
let notifyBtn, notifyForm, notifyEmail, submitBtn, errorDiv, successDiv;

function initElements() {
  notifyBtn = document.getElementById('notifyBtn');
  notifyForm = document.getElementById('notifyForm');
  notifyEmail = document.getElementById('notifyEmail');
  submitBtn = document.getElementById('submitNotify');
  errorDiv = document.getElementById('notifyError');
  successDiv = document.getElementById('notifySuccess');
}

// Expand button → show form
function expandForm() {
  if (isExpanded) return;

  notifyBtn.style.display = 'none';
  notifyForm.style.display = 'flex';
  isExpanded = true;

  // Auto-focus input
  setTimeout(() => notifyEmail.focus(), 100);
}

// Collapse form → show button
function collapseForm() {
  notifyForm.style.display = 'none';
  notifyBtn.style.display = 'inline-flex';
  isExpanded = false;
}

// Show error message
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 4000);
}

// Show success state
function showSuccess() {
  notifyForm.style.display = 'none';
  successDiv.style.display = 'inline-block';

  // Auto-collapse after 5s
  setTimeout(() => {
    successDiv.style.display = 'none';
    notifyEmail.value = '';
    collapseForm();
  }, 5000);
}

// Validate email client-side
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Submit email to Worker
async function submitEmail() {
  const email = notifyEmail.value.trim();

  // Validation
  if (!email) {
    showError('Email required');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Invalid email format');
    return;
  }

  // Disable button during submission
  submitBtn.disabled = true;
  submitBtn.textContent = '...';

  try {
    const response = await fetch(`${WORKER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Submission failed');
    }

    // Success
    showSuccess();

  } catch (error) {
    console.error('Notify error:', error);
    showError(error.message || 'Network error. Try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = '→';
  }
}

// Event listeners
function attachListeners() {
  notifyBtn.addEventListener('click', expandForm);

  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    submitEmail();
  });

  notifyEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitEmail();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isExpanded) {
      collapseForm();
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initElements();
    attachListeners();
  });
} else {
  initElements();
  attachListeners();
}
