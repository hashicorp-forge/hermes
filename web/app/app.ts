import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from 'hermes/config/environment';
import Ember from 'ember';
import EmberObject from '@ember/object';
import { assert } from '@ember/debug';

// Expose Ember globally for legacy addons like torii
// This is needed because torii@0.10.1 expects a global Ember object with specific properties
if (typeof window !== 'undefined') {
  (window as any).Ember = Ember;
  // Ensure Ember.Object is available for torii
  if (!(window as any).Ember.Object) {
    (window as any).Ember.Object = EmberObject;
  }
  // Ember.Error is available from the main ember package
  if (!(window as any).Ember.Error) {
    // Create a custom Error class since Ember.Error was deprecated
    (window as any).Ember.Error = class EmberError extends Error {
      constructor(message?: string) {
        super(message);
        this.name = 'EmberError';
      }
    };
  }
  // Ensure Ember.assert is available
  if (!(window as any).Ember.assert) {
    (window as any).Ember.assert = assert;
  }
}

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);
