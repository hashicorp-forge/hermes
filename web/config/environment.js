"use strict";

const getEnv = (key, defaultValue) => {
  const fullKey = `HERMES_WEB_${key}`;
  const value = process.env[fullKey];
  if (value == null) {
    console.warn(
      `env var ${fullKey} was not set! Proceeding with default value "${defaultValue}"`,
    );
  }
  return value != null ? value : defaultValue;
};

module.exports = function (environment) {
  let ENV = {
    modulePrefix: "hermes",
    environment,
    rootURL: "/",
    locationType: "history",
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false,
      },
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
      rootElement: '#ember-application',
    },
    metricsAdapters: [
      {
        name: "GoogleAnalyticsFour",
        environments: ["development", "production"],
        config: {
          id: getEnv("GOOGLE_ANALYTICS_TAG_ID", null),
        },
      },
    ],
    algolia: {
      // Index names used by the search service
      // Note: Algolia credentials are NOT needed here - all search requests
      // are proxied through the Hermes backend at /1/indexes/*
      docsIndexName: getEnv("ALGOLIA_DOCS_INDEX_NAME", "docs"),
      draftsIndexName: getEnv("ALGOLIA_DRAFTS_INDEX_NAME", "drafts"),
      internalIndexName: getEnv("ALGOLIA_INTERNAL_INDEX_NAME", "internal"),
      projectsIndexName: getEnv("ALGOLIA_PROJECTS_INDEX_NAME", "projects"),
    },

    flashMessageDefaults: {
      timeout: 5000,
      extendedTimeout: 1000,
      type: "success",
      types: ["critical", "success"],
    },

    // ember-simple-auth configuration
    // Session setup is called manually in application route's beforeModel after config is loaded
    'ember-simple-auth': {
      useSessionSetupMethod: false,  // We call session.setup() manually after loading config
    },

    google: {
      docFolders: getEnv("GOOGLE_DOCFOLDERS", "").split(","),
    },

    skipGoogleAuth: getEnv("SKIP_GOOGLE_AUTH"),

    shortLinkBaseURL: getEnv("SHORT_LINK_BASE_URL"),

    // Authentication configuration
    // Note: Auth provider is determined at runtime via /api/v2/web/config
    // Google OAuth uses ember-simple-auth directly (no Torii library)
    // OIDC providers (Okta/Dex) use backend redirect flows

    showEmberAnimatedTools: getEnv("SHOW_EMBER_ANIMATED_TOOLS", false),

    featureFlags: {},
  };

  // Disable Mirage when MIRAGE_ENABLED=false (for testing with real backend)
  if (process.env.MIRAGE_ENABLED === 'false') {
    ENV['ember-cli-mirage'] = {
      enabled: false
    };
  }

  if (environment === "development") {
    ENV.shortLinkBaseURL = "https://fake.short.link";

    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === "test") {
    ENV.shortLinkBaseURL = "https://fake.short.link";

    // Testem prefers this...
    ENV.locationType = "none";

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = "#ember-testing";
    ENV.APP.autoboot = false;
  }

  if (environment === "production") {
    // here you can enable a production-specific feature
  }

  return ENV;
};
