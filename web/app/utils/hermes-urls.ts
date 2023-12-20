export const HERMES_GITHUB_REPO_URL =
  "https://github.com/hashicorp-forge/hermes";

/**
 * These values are loaded by the Mirage in acceptance tests.
 *
 * To mock them in rendering tests, set them directly on the service, e.g.,
 * let mockConfigSvc = this.owner.lookup("service:config") as ConfigService;
 * mockConfigSvc.config.support_link_url = SUPPORT_URL;
 */
export const TEST_SUPPORT_URL = "https://config-loaded-support-link.com";
export const TEST_SHORT_LINK_BASE_URL =
  "https://config-loaded-short-link-base-url.com";
export const TEST_JIRA_WORKSPACE_URL = "https://hashicorp.atlassian.net";
