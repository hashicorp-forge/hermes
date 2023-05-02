/**
 * Type declarations for
 *    import config from 'my-app/config/environment'
 */
declare const config: {
  environment: string;
  modulePrefix: string;
  podModulePrefix: string;
  locationType: "history" | "hash" | "none" | "auto";
  rootURL: string;
  APP: Record<string, unknown>;
  algolia: {
    appID: string;
    apiKey: string;
    docsIndexName: string;
    draftsIndexName: string;
    internalIndexName: string;
  };
  featureFlags: Record<string, boolean>;
  google: {
    docFolders: string;
  };
  shortLinkBaseURL: string;
  skipGoogleAuth: boolean;
};

export default config;
