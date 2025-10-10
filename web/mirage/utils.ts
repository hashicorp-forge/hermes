import { MirageTestContext } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import config from "hermes/config/environment";

import { run } from "@ember/runloop";
import StoreService from "hermes/services/store";

export const TEST_USER_NAME = "Test user";
export const TEST_USER_EMAIL = "testuser@hashicorp.com";
export const TEST_USER_PHOTO = "https://test-user-at-hashicorp.com/photo.jpg";
export const TEST_USER_GIVEN_NAME = "Test";

export const TEST_USER_2_NAME = "Foo Bar";
export const TEST_USER_2_EMAIL = "foo@hashicorp.com";
export const TEST_USER_2_GIVEN_NAME = "Foo";

export const TEST_USER_3_EMAIL = "bar@hashicorp.com";

export const TEST_JIRA_ISSUE_URL = "https://test-jira-issue-url.com";
export const TEST_JIRA_ISSUE_SUMMARY = "This is a Jira object";
export const TEST_JIRA_ISSUE_STATUS = "Open";
export const TEST_JIRA_ASSIGNEE = TEST_USER_EMAIL;
export const TEST_JIRA_ASSIGNEE_AVATAR = TEST_USER_PHOTO;
export const TEST_JIRA_ISSUE_TYPE = "Task";
export const TEST_JIRA_ISSUE_TYPE_IMAGE = "test-jira-issue-type-image.com";
export const TEST_JIRA_PRIORITY = "Medium";
export const TEST_JIRA_PRIORITY_IMAGE = "https://test-jira-priority-image.com";

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

export const TEST_WEB_CONFIG = {
  algolia_docs_index_name: config.algolia.docsIndexName,
  algolia_drafts_index_name: config.algolia.draftsIndexName,
  algolia_internal_index_name: config.algolia.internalIndexName,
  algolia_projects_index_name: config.algolia.projectsIndexName,
  api_version: "v2",
  feature_flags: {},
  jira_url: TEST_JIRA_WORKSPACE_URL,
  google_doc_folders: "",
  short_link_base_url: TEST_SHORT_LINK_BASE_URL,
  skip_google_auth: false,
  group_approvals: true,
  google_analytics_tag_id: undefined,
  support_link_url: TEST_SUPPORT_URL,
  version: "1.2.3",
  short_revision: "abc123",
};

// https://www.ember-cli-mirage.com/docs/testing/integration-and-unit-tests

/**
 * Pushes Mirage models into the store, allowing them
 * to be found using `store.peekAll` and `store.peekRecord`.
 * Called during the `authenticateTestUser` utility function
 * to ensure that the default user can be found in the store.
 */
export function pushMirageIntoStore(context: MirageTestContext) {
  let store = context.owner.lookup("service:store") as StoreService;

  const { server } = context;
  const { schema } = server;

  const keys = Object.keys(schema).filter(
    (key) => schema[key].all !== undefined,
  );

  keys.forEach((resource) => {
    const model = schema[resource].all();

    let { models = [] } = model;
    let { modelName } = model;

    // Ignore non-EmberData models
    try {
      store.modelFor(modelName);
    } catch (e) {
      return;
    }

    const records = models.map((model: any) => {
      const { attrs } = model;
      return {
        id: attrs.id,
        type: modelName,
        attributes: attrs,
      };
    });

    run(() => {
      store.push({
        data: records,
      });
    });
  });
}

export function authenticateTestUser(mirageContext: MirageTestContext) {
  mirageContext.server.create("me");

  const authenticatedUserService = mirageContext.owner.lookup(
    "service:authenticated-user",
  ) as AuthenticatedUserService;

  const personRecord = mirageContext.server.create("person", {
    id: TEST_USER_EMAIL,
    email: TEST_USER_EMAIL,
    name: TEST_USER_NAME,
    firstName: TEST_USER_GIVEN_NAME,
    picture: TEST_USER_PHOTO,
  });

  // Populate `authenticatedUser.info` with the record attrs
  authenticatedUserService._info = personRecord.attrs;

  // Push models into the store to be peeked
  pushMirageIntoStore(mirageContext);
}

export function setFeatureFlag(
  mirageContext: MirageTestContext,
  flag: string,
  value: boolean,
) {
  const configSvc = mirageContext.owner.lookup(
    "service:config",
  ) as ConfigService;

  configSvc.config.feature_flags[flag] = value;
}

/**
 * Sets a custom config for a specific key.
 * Used in integration tests to mock different values.
 * For acceptance tests, replace the getter for `/web/config`.
 */
export function setWebConfig(
  mirageContext: MirageTestContext,
  key: string,
  value: any,
) {
  const updatedConfig = {
    ...TEST_WEB_CONFIG,
    [key]: value,
  };

  const configSvc = mirageContext.owner.lookup(
    "service:config",
  ) as ConfigService;

  configSvc.config = updatedConfig as any;
}
