declare module 'hermes/config/environment' {
  export interface MicrosoftAuthConfig {
    clientId: string;
    tenantId: string;
    redirectUri: string;
  }

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
        projectsIndexName: string;
    };
    createDocsAsUser: boolean;
    featureFlags: Record<string, boolean>;
    google: {
        docFolders: string;
    };
    shortLinkBaseURL: string;
    skipGoogleAuth: boolean;
    groupApprovals: boolean;
    showEmberAnimatedTools: boolean;
    supportLinkURL: string;
    version: string;
    shortRevision: string;
    jiraURL: string;

    microsoft?: MicrosoftAuthConfig;
    // torii: {
    //   sessionServiceName: string;
    //   providers: {
    //     'google-oauth2-bearer-v2': {
    //       apiKey: string;
    //       hd: string;
    //       scope: string;
    //     };
    //   };
    // };
    featureFlags: Record<string, boolean>;
  }

  const config: HermesConfig;
  export default config;
}
