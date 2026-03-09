/**
 * OAuth callback handler script.
 * 
 * This handles the OAuth callback in the popup window after ALB OIDC
 * authentication completes and signals success to the parent add-in.
 * 
 * The actual authentication session is stored in ALB OIDC cookies,
 * which the add-in accesses via the Storage Access API.
 */

import { sendAuthResultToOpener } from './taskpane/utils/authPopup';

const AUTH_INIT_DELAY = 300;

interface AuthInfo {
  success: boolean;
  email?: string;
  error?: string;
}

/**
 * Gets a cookie value by name.
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  return null;
}

/**
 * Extracts authentication success information.
 * We just need to confirm OIDC completed - the session cookie handles auth.
 */
function extractAuthInfo(): AuthInfo {
  // Check for error in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');

  if (error) {
    return {
      success: false,
      error: urlParams.get('error_description') || error
    };
  }

  // Check for user_email cookie (set by backend after successful auth)
  const userEmail = getCookie('user_email');

  if (userEmail) {
    return {
      success: true,
      email: userEmail
    };
  }

  // Check if ALB OIDC session cookie exists (indicates auth completed)
  // The cookie name is set in Terraform: session_cookie_name = "AWSELBAuthSessionCookie"
  const albCookie = getCookie('AWSELBAuthSessionCookie');
  if (albCookie) {
    return {
      success: true,
      email: 'authenticated' // We have a session but don't know email from cookie
    };
  }

  return {
    success: false,
    error: 'Authentication not completed'
  };
}

/**
 * Creates a styled container element with flex layout.
 */
function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
    padding: '20px'
  });
  return container;
}

/**
 * Creates an icon element.
 */
function createIcon(icon: string, fontSize: string = '48px', marginBottom: string = '20px'): HTMLDivElement {
  const iconDiv = document.createElement('div');
  iconDiv.textContent = icon;
  Object.assign(iconDiv.style, {
    fontSize,
    marginBottom
  });
  return iconDiv;
}

/**
 * Creates a heading element.
 */
function createHeading(text: string): HTMLHeadingElement {
  const heading = document.createElement('h1');
  heading.textContent = text;
  Object.assign(heading.style, {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '12px'
  });
  return heading;
}

/**
 * Creates a paragraph element.
 */
function createParagraph(
  text: string,
  color: string = '#999',
  fontSize: string = '14px',
  marginBottom: string = '20px'
): HTMLParagraphElement {
  const para = document.createElement('p');
  para.textContent = text;
  Object.assign(para.style, {
    fontSize,
    color,
    marginBottom
  });
  return para;
}

/**
 * Creates a styled button element.
 */
function createButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  Object.assign(button.style, {
    padding: '10px 20px',
    backgroundColor: '#0078d4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  });
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Displays success UI using secure DOM manipulation.
 */
function showSuccess(email: string): void {
  // Clear body and create container
  document.body.textContent = '';
  const container = createContainer();

  // Add success icon
  container.appendChild(createIcon('✓'));

  // Add heading
  container.appendChild(createHeading('Authentication Successful'));

  // Add email message
  const emailText = email !== 'authenticated' ? `Signed in as ${email}` : 'Signed in';
  container.appendChild(createParagraph(emailText));

  // Add closing message
  const closingMsg = document.createElement('p');
  closingMsg.textContent = 'This window will close automatically...';
  Object.assign(closingMsg.style, {
    fontSize: '12px',
    color: '#666'
  });
  container.appendChild(closingMsg);

  document.body.appendChild(container);
}

/**
 * Displays error UI using secure DOM manipulation.
 */
function showError(error: string): void {
  // Clear body and create container
  document.body.textContent = '';
  const container = createContainer();

  // Add error icon
  container.appendChild(createIcon('✗'));

  // Add heading
  container.appendChild(createHeading('Authentication Failed'));

  // Add error message (textContent automatically prevents XSS)
  container.appendChild(createParagraph(error));

  // Add close button
  const closeButton = createButton('Close Window', () => window.close());
  container.appendChild(closeButton);

  document.body.appendChild(container);
}

/**
 * Main initialization function.
 */
function init(): void {
  setTimeout(() => {
    const authInfo = extractAuthInfo();

    if (authInfo.success) {
      sendAuthResultToOpener(authInfo);
      showSuccess(authInfo.email || 'authenticated');

      // Close popup after brief delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      console.error('Authentication failed:', authInfo.error);
      sendAuthResultToOpener(authInfo);
      showError(authInfo.error || 'Unknown error');
    }
  }, AUTH_INIT_DELAY);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

