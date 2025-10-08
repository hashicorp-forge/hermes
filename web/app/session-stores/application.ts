import CookieStore from 'ember-simple-auth/session-stores/cookie';

/**
 * Session store for Hermes application.
 * 
 * Uses cookie-based storage for session persistence, which works well with
 * Dex authentication (session-based) and is also compatible with OAuth providers.
 * 
 * For Dex: Session cookies are managed by the backend
 * For Google/Okta: OAuth tokens are stored in cookies
 */
export default class ApplicationSessionStore extends CookieStore {
  /**
   * Name of the cookie used to store session data.
   * This should match the cookie name expected by the backend.
   */
  cookieName = 'ember_simple_auth-session';
  
  /**
   * Cookie domain - null means use the current domain
   */
  cookieDomain = null;
  
  /**
   * Cookie path - '/' makes it available across the entire application
   */
  cookiePath = '/';
  
  /**
   * Cookie expiration time in seconds.
   * null = session cookie (expires when browser closes)
   * 
   * For production, consider setting a value like 7200 (2 hours) to match
   * the backend session timeout.
   */
  cookieExpirationTime = null;
}
