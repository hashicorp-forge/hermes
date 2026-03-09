/**
 * Authentication popup utility for handling OAuth flows in a separate window.
 * 
 * This implements Microsoft's recommended approach for Office Add-ins:
 * 1. Open dialog using Office Dialog API for authentication (first-party context)
 * 2. ALB OIDC sets session cookies in dialog
 * 3. Use Storage Access API to access those cookies from iframe
 * 
 * @see https://learn.microsoft.com/en-us/office/dev/add-ins/develop/itp-and-third-party-cookies
 */

import { requestStorageAccess, hasStorageAccess } from './storageAccess';

export interface AuthResult {
  success: boolean;
  email?: string;
  error?: string;
}

const AUTH_TIMEOUT = 300000;
const SAFARI_DASHBOARD_PRELOAD_DELAY = 2000;

function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
}

function prepareSafariAuthUrl(authUrl: string): string {
  try {
    const url = new URL(authUrl);
    const baseUrl = `${url.protocol}//${url.host}`;
    const encodedAuthUrl = encodeURIComponent(authUrl);
    return `${baseUrl}/addin/safari-init.html?redirect_to=${encodedAuthUrl}&delay=${SAFARI_DASHBOARD_PRELOAD_DELAY}`;
  } catch {
    return authUrl;
  }
}

/**
 * Initiates OAuth flow using Office Dialog API.
 * This avoids popup blocker issues in Office Add-ins.
 * 
 * @param authUrl The authentication URL to open in the dialog
 * @returns Promise that resolves when dialog is closed
 */
export async function authenticateWithPopup(authUrl: string): Promise<AuthResult> {
  const safari = isSafari();
  const finalAuthUrl = safari ? prepareSafariAuthUrl(authUrl) : authUrl;

  return new Promise((resolve, reject) => {
    if (typeof Office === 'undefined' || !Office.context || !Office.context.ui) {
      return fallbackWindowOpen(finalAuthUrl, resolve, reject);
    }

    Office.context.ui.displayDialogAsync(
      finalAuthUrl,
      {
        height: 60,  // percentage of screen height
        width: 40,   // percentage of screen width
        promptBeforeOpen: false
      },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error('Failed to open dialog:', result.error);
          // Try fallback
          return fallbackWindowOpen(authUrl, resolve, reject);
        }

        const dialog = result.value;
        let timeoutId: NodeJS.Timeout | null = null;
        let resolved = false;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
        };

        // Listen for dialog events
        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          dialog.close();

          try {
            const message = JSON.parse(arg.message);
            if (message.type === 'AUTH_COMPLETE') {
              resolve({
                success: message.success,
                email: message.email,
                error: message.error
              });
            } else {
              // Assume success if we got any message
              resolve({ success: true });
            }
          } catch {
            // Message wasn't JSON, assume success
            resolve({ success: true });
          }
        });

        dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg: any) => {
          if (resolved) return;
          resolved = true;
          cleanup();

          // Dialog was closed by user - assume auth completed
          // (we verify later via API call)
          if (arg.error === 12006) { // Dialog closed
            resolve({ success: true });
          } else {
            resolve({ success: true }); // Assume success, verify later
          }
        });

        // Timeout
        timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          dialog.close();
          reject(new Error('Authentication timeout. Please try again.'));
        }, AUTH_TIMEOUT);
      }
    );
  });
}

/**
 * Fallback to window.open for non-Office environments or when Dialog API fails.
 */
function fallbackWindowOpen(
  authUrl: string,
  resolve: (value: AuthResult) => void,
  reject: (reason: Error) => void
): void {
  const safari = isSafari();
  const finalAuthUrl = safari ? prepareSafariAuthUrl(authUrl) : authUrl;

  const popupWidth = 500;
  const popupHeight = 600;
  const left = window.screenX + (window.outerWidth - popupWidth) / 2;
  const top = window.screenY + (window.outerHeight - popupHeight) / 2;

  const popup = window.open(
    finalAuthUrl,
    'hermes-auth',
    `width=${popupWidth},height=${popupHeight},left=${left},top=${top},popup=yes`
  );

  if (!popup) {
    reject(new Error('Failed to open authentication window. Please check your popup blocker settings.'));
    return;
  }

  let timeoutId: NodeJS.Timeout | null = null;
  let checkIntervalId: NodeJS.Timeout | null = null;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (checkIntervalId) clearInterval(checkIntervalId);
  };

  timeoutId = setTimeout(() => {
    cleanup();
    if (popup && !popup.closed) {
      popup.close();
    }
    reject(new Error('Authentication timeout. Please try again.'));
  }, AUTH_TIMEOUT);

  checkIntervalId = setInterval(() => {
    if (popup.closed) {
      cleanup();
      resolve({ success: true });
    }
  }, 500);
}

export async function grantStorageAccess(baseUrl?: string): Promise<boolean> {
  return await requestStorageAccess(baseUrl);
}

export async function initializeStorageAccess(baseUrl?: string): Promise<boolean> {
  const { hasStorageAccess, tryRestoreStorageAccess, verifyStorageAccessWorks } = await import('./storageAccess');
  
  const currentAccess = await hasStorageAccess();
  if (currentAccess) {
    if (baseUrl) {
      return await verifyStorageAccessWorks(baseUrl);
    }
    return true;
  }

  return await tryRestoreStorageAccess(baseUrl);
}

/**
 * Sends authentication result to the parent window (opener).
 * Called from the OAuth callback page.
 */
export function sendAuthResultToOpener(result: AuthResult): void {
  if (window.opener) {
    try {
      // Try to get the opener's origin. This may fail due to cross-origin restrictions.
      let targetOrigin: string;
      try {
        targetOrigin = window.opener.location.origin;
      } catch (e) {
        // If we can't access opener.location due to cross-origin restrictions,
        // fall back to current window origin (should be same origin as opener for this flow)
        console.warn('Cannot access window.opener.location.origin, using window.location.origin', e);
        targetOrigin = window.location.origin;
      }

      window.opener.postMessage(
        {
          type: 'AUTH_COMPLETE',
          success: result.success,
          email: result.email,
          error: result.error
        },
        targetOrigin
      );
    } catch (e) {
      console.error('Failed to send auth result to opener:', e);
    }
  }
}

/**
 * Checks if cookies are accessible and authentication is valid.
 * Uses Storage Access API to check cookie availability.
 */
export async function checkAuthStatus(baseUrl: string): Promise<boolean> {
  try {
    // First check if we have storage access
    const hasAccess = await hasStorageAccess();
    if (!hasAccess) {
      console.log('No storage access - authentication required');
      return false;
    }

    // Make a test request to check if ALB OIDC session is valid
    const response = await fetch(`${baseUrl}/api/v2/me`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}

/**
 * Clears authentication state.
 */
export function clearAuth(): void {
  // No local state to clear with cookie-based auth
  console.log('Auth cleared');
}

