/**
 * Type declarations for
 *    import config from 'my-app/config/environment'
 */
export interface HermesConfig {
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
  createDocsAsUser: boolean;
  featureFlags: Record<string, boolean>;
  google: {
    docFolders: string;
  };
  shortLinkBaseURL: string;
  skipGoogleAuth: boolean;
  showEmberAnimatedTools: boolean;
  supportLinkURL: string;
  version: string;
  shortRevision: string;
  jiraURL: string;
}

declare const config: HermesConfig;

export default config;
