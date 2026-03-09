/**
 * Safari initialization script for authentication flow.
 * 
 * This page is shown in Safari when initiating authentication,
 * validates the redirect URL, and redirects to the auth endpoint.
 */

import './safari-init.css';

// Configuration
const TRUSTED_DOMAINS = ['login.microsoftonline.com'];
const MAX_REDIRECT_LENGTH = 2048;

/**
 * Validates redirect URL to prevent open redirect vulnerability.
 */
function isValidRedirectUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string' || url.length > MAX_REDIRECT_LENGTH) {
    return false;
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const parsedUrl = new URL(decodedUrl, window.location.origin);
    
    // Only allow HTTPS (or same-origin HTTP for local development)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.origin !== window.location.origin) {
      return false;
    }

    // Allow same-origin redirects
    if (parsedUrl.origin === window.location.origin) {
      return true;
    }

    // Allow HTTPS URLs from trusted domains only
    return parsedUrl.protocol === 'https:' && 
           TRUSTED_DOMAINS.some(domain => 
             parsedUrl.hostname === domain || 
             parsedUrl.hostname.endsWith('.' + domain)
           );
  } catch (e) {
    console.error('URL validation error:', e);
    return false;
  }
}

/**
 * Creates and returns an element with text content.
 */
function createElement(tag: string, text?: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

/**
 * Displays error message using secure DOM manipulation.
 */
function showError(title: string, message: string): void {
  const container = document.getElementById('container');
  if (!container) return;
  
  container.textContent = ''; // Clear existing content

  container.appendChild(createElement('div', '⚠️', 'icon'));
  container.appendChild(createElement('h1', title));
  container.appendChild(createElement('p', message, 'error'));
}

/**
 * Shows loading state with spinner.
 */
function showLoading(): void {
  const container = document.getElementById('container');
  if (!container) return;
  
  container.textContent = ''; // Clear existing content

  container.appendChild(createElement('div', '', 'spinner'));
  container.appendChild(createElement('h1', 'Redirecting...'));
  container.appendChild(createElement('p', 'Please wait...'));
}

/**
 * Shows initial sign-in UI.
 */
function showSignIn(onContinue: () => void): void {
  const container = document.getElementById('container');
  if (!container) return;
  
  container.textContent = ''; // Clear existing content

  container.appendChild(createElement('div', '🔐', 'icon'));
  container.appendChild(createElement('h1', 'Sign In to Hermes'));
  container.appendChild(createElement('p', 'Click below to continue with authentication.'));

  const button = createElement('button', 'Continue to Sign In', 'btn') as HTMLButtonElement;
  button.addEventListener('click', onContinue);
  container.appendChild(button);
}

/**
 * Initializes the authentication flow.
 */
function init(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTo = urlParams.get('redirect_to');

  // Validate redirect parameter exists
  if (!redirectTo) {
    showError('Invalid Request', 'Missing redirect parameter.');
    return;
  }

  // Validate redirect URL
  if (!isValidRedirectUrl(redirectTo)) {
    showError('Invalid Request', 'Redirect URL is not allowed for security reasons.');
    return;
  }

  // Show sign-in UI
  showSignIn(() => {
    showLoading();
    
    // Perform redirect after brief delay to show loading state
    setTimeout(() => {
      window.location.href = decodeURIComponent(redirectTo);
    }, 300);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
