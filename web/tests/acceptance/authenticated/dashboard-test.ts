import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { TEST_USER_EMAIL, TEST_USER_GIVEN_NAME } from "hermes/mirage/utils";

const DOC_AWAITING_REVIEW = "[data-test-doc-awaiting-review]";
const WELCOME_MESSAGE = "[data-test-welcome-message]";

interface AuthenticatedDashboardRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/dashboard", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");
    assert.equal(getPageTitle(), "Dashboard | Hermes");
  });

  test("it shows docs awaiting review", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    const title = "Test title 25";

    this.server.create("document", {
      title,
      approvers: [TEST_USER_EMAIL],
      status: "In-Review",
    });

    await visit("/dashboard");

    assert.dom(DOC_AWAITING_REVIEW).exists({ count: 1 }).containsText(title);
  });

  test("it welcomes the logged-in user", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");

    assert
      .dom(WELCOME_MESSAGE)
      .containsText(
        `Welcome back, ${TEST_USER_GIVEN_NAME}!`,
        `displays the user's "given_name"`,
      );
  });
});
