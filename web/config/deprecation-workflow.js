self.deprecationWorkflow = self.deprecationWorkflow || {};
self.deprecationWorkflow.config = {
  workflow: [
    { handler: "log", matchId: "ember-global" },
    {
      handler: "log",
      matchId: "ember-simple-auth.initializer.setup-session-restoration",
    },
    { handler: "log", matchId: "deprecate-router-events" },
    { handler: "log", matchId: "this-property-fallback" },
  ],
};
