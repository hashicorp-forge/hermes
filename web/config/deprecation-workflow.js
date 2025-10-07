self.deprecationWorkflow = self.deprecationWorkflow || {};
self.deprecationWorkflow.config = {
  workflow: [
    // All Hermes-specific deprecations have been fixed:
    // 1. ember-global: Fixed by using @ember/array import in types/hermes/index.d.ts
    // 2. ember-simple-auth.initializer.setup-session-restoration: Fixed by adding useSessionSetupMethod config
    // 3. deprecate-router-events: Fixed by removing ember-router-scroll@4.1.2
    // 4. this-property-fallback: No instances found - code already uses this. prefix correctly
    
    // External library deprecations (from @ember/test-helpers, ember-data, etc.)
    // These are from node_modules and will be fixed when libraries update to Ember 7.0
    { handler: "silence", matchId: "deprecate-import-env-from-ember" },
    { handler: "silence", matchId: "deprecate-import-templates-from-ember" },
    { handler: "silence", matchId: "deprecate-import-libraries-from-ember" },
    { handler: "silence", matchId: "deprecate-import--set-classic-decorator-from-ember" },
    { handler: "silence", matchId: "deprecate-import--is-destroying-from-ember" },
    { handler: "silence", matchId: "deprecate-import--is-destroyed-from-ember" },
    { handler: "silence", matchId: "deprecate-import-destroy-from-ember" },
    { handler: "silence", matchId: "deprecate-import--register-destructor-from-ember" },
    { handler: "silence", matchId: "importing-inject-from-ember-service" },
    { handler: "silence", matchId: "deprecate-import-change-properties-from-ember" },
    { handler: "silence", matchId: "deprecate-import-test-from-ember" },
    { handler: "silence", matchId: "deprecate-import-onerror-from-ember" },
  ],
};
