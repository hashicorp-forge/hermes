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
    locationType: "auto",
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
      appID: getEnv("ALGOLIA_APP_ID"),
      docsIndexName: getEnv("ALGOLIA_DOCS_INDEX_NAME", "docs"),
      draftsIndexName: getEnv("ALGOLIA_DRAFTS_INDEX_NAME", "drafts"),
      internalIndexName: getEnv("ALGOLIA_INTERNAL_INDEX_NAME", "internal"),
      projectsIndexName: getEnv("ALGOLIA_PROJECTS_INDEX_NAME", "projects"),
      apiKey: getEnv("ALGOLIA_SEARCH_API_KEY"),
    },

    flashMessageDefaults: {
      timeout: 5000,
      extendedTimeout: 1000,
      type: "success",
      types: ["critical", "success"],
    },

    google: {
      docFolders: getEnv("GOOGLE_DOCFOLDERS", "").split(","),
    },

    skipGoogleAuth: getEnv("SKIP_GOOGLE_AUTH"),

    shortLinkBaseURL: getEnv("SHORT_LINK_BASE_URL"),

    torii: {
      sessionServiceName: "session",
      providers: {
        "google-oauth2-bearer-v2": {
          apiKey: getEnv("GOOGLE_OAUTH2_CLIENT_ID"),
          hd: getEnv("GOOGLE_OAUTH2_HD"),
          scope: "email profile https://www.googleapis.com/auth/drive.appdata",
        },
      },
    },

    showEmberAnimatedTools: getEnv("SHOW_EMBER_ANIMATED_TOOLS", false),

    featureFlags: {},
  };

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
