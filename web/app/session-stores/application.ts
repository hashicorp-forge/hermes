// Required by Ember Simple Auth 7.x
// This session store persists session data in localStorage (or cookies as fallback)
// @ts-ignore - ESA types may not be fully available
import AdaptiveStore from 'ember-simple-auth/session-stores/adaptive';

export default class ApplicationSessionStore extends AdaptiveStore {}
