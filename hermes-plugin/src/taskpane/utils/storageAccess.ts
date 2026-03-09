/**
 * Storage Access API utilities for handling third-party cookie access in Office Add-ins.
 * This enables the add-in (running in a third-party iframe) to access cookies
 * set during first-party popup authentication (ALB OIDC session cookie).
 */

const STORAGE_ACCESS_GRANTED_KEY = 'storageAccessGranted';
const LAST_AUTH_CHECK_KEY = 'lastAuthCheck';

export async function hasStorageAccess(): Promise<boolean> {
  if (!document.hasStorageAccess) {
    return true;
  }

  try {
    return await document.hasStorageAccess();
  } catch {
    return false;
  }
}

export function wasStorageAccessPreviouslyGranted(): boolean {
  try {
    return localStorage.getItem(STORAGE_ACCESS_GRANTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markStorageAccessGranted(): void {
  try {
    localStorage.setItem(STORAGE_ACCESS_GRANTED_KEY, 'true');
    localStorage.setItem(LAST_AUTH_CHECK_KEY, Date.now().toString());
  } catch {}
}

export function clearStorageAccessFlag(): void {
  try {
    localStorage.removeItem(STORAGE_ACCESS_GRANTED_KEY);
    localStorage.removeItem(LAST_AUTH_CHECK_KEY);
  } catch {}
}

export async function verifyStorageAccessWorks(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/v2/me`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      redirect: 'manual'
    });

    if (response.type === 'opaqueredirect' || response.status === 0) {
      clearStorageAccessFlag();
      return false;
    }

    if (response.ok) {
      markStorageAccessGranted();
      return true;
    }

    clearStorageAccessFlag();
    return false;
  } catch {
    clearStorageAccessFlag();
    return false;
  }
}

export async function requestStorageAccess(baseUrl?: string): Promise<boolean> {
  if (!document.requestStorageAccess) {
    if (baseUrl) {
      return await verifyStorageAccessWorks(baseUrl);
    }
    markStorageAccessGranted();
    return true;
  }

  try {
    await document.requestStorageAccess();
    if (baseUrl) {
      return await verifyStorageAccessWorks(baseUrl);
    }
    markStorageAccessGranted();
    return true;
  } catch {
    try {
      const alreadyHasAccess = await document.hasStorageAccess();
      if (alreadyHasAccess) {
        if (baseUrl) {
          return await verifyStorageAccessWorks(baseUrl);
        }
        markStorageAccessGranted();
        return true;
      }
    } catch {}
    clearStorageAccessFlag();
    return false;
  }
}

export async function tryRestoreStorageAccess(baseUrl?: string): Promise<boolean> {
  if (!wasStorageAccessPreviouslyGranted()) {
    return false;
  }

  const currentAccess = await hasStorageAccess();
  if (currentAccess) {
    if (baseUrl) {
      const verified = await verifyStorageAccessWorks(baseUrl);
      if (!verified) {
        return false;
      }
    }
    return true;
  }

  try {
    await document.requestStorageAccess();
    if (baseUrl) {
      const verified = await verifyStorageAccessWorks(baseUrl);
      if (verified) {
        return true;
      }
      return false;
    }
    markStorageAccessGranted();
    return true;
  } catch {
    clearStorageAccessFlag();
    return false;
  }
}

export async function fetchWithStorageAccess(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const hasAccess = await hasStorageAccess();
  if (!hasAccess) {
    throw new Error('Storage access is not available; cannot perform authenticated fetch.');
  }
  return fetch(url, { ...options, credentials: 'include' });
}

export function isStorageAccessApiSupported(): boolean {
  return typeof document.hasStorageAccess === 'function' &&
    typeof document.requestStorageAccess === 'function';
}
