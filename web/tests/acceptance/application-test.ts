import { click, teardownContext, visit, waitFor } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import SessionService from "hermes/services/session";

module("Acceptance | application", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  interface ApplicationTestContext extends MirageTestContext {
    session: SessionService;
  }

  hooks.beforeEach(function () {
    this.set("session", this.owner.lookup("service:session"));
  });

  test("a message shows when the front-end auth token expires", async function (this: ApplicationTestContext, assert) {
    await authenticateSession({});

    await visit("/");

    assert
      .dom("[data-test-flash-notification]")
      .doesNotExist("no flash notification when session is valid");

    await this.session.invalidate();

    await waitFor("[data-test-flash-notification]");

    assert
      .dom("[data-test-flash-notification]")
      .exists("flash notification is shown when session is invalid");

    assert
      .dom("[data-test-flash-notification-title]")
      .hasText("Login token expired");

    assert
      .dom("[data-test-flash-notification-description]")
      .hasText("Please reauthenticate to keep using Hermes.");

    assert
      .dom("[data-test-flash-notification-button]")
      .hasText("Authenticate with Google");
    /**
     * FIXME: Investigate unresolved promises
     *
     * For reasons not yet clear, this test has unresolved promises
     * that prevent it from completing naturally. Because of this,
     * we handle teardown manually.
     *
     */
    teardownContext(this);
  });

  test("a message shows when the back-end auth token expires", async function (this: ApplicationTestContext, assert) {
    await authenticateSession({});

    await visit("/");

    assert
      .dom("[data-test-flash-notification]")
      .doesNotExist("no flash notification when session is valid");

    this.server.schema.mes.first().update("isLoggedIn", false);

    await waitFor("[data-test-flash-notification]");

    assert
      .dom("[data-test-flash-notification]")
      .exists("flash notification is shown when session is invalid");

    /**
     * FIXME: Investigate unresolved promises
     *
     * For reasons not yet clear, this test has unresolved promises
     * that prevent it from completing naturally. Because of this,
     * we handle teardown manually.
     *
     */
    teardownContext(this);
  });

  test("the authorize button works as expected", async function (this: ApplicationTestContext, assert) {
    let authCount = 0;

    await authenticateSession({});

    this.session.authenticate = () => {
      authCount++;
    };

    await visit("/");
    await this.session.invalidate();
    await waitFor("[data-test-flash-notification]");
    await click("[data-test-flash-notification-button]");

    assert
      .dom("[data-test-flash-notification]")
      .doesNotExist("flash notification is dismissed on buttonClick");

    assert.equal(authCount, 1, "session.authenticate() was called");

    /**
     * FIXME: Investigate unresolved promises
     *
     * For reasons not yet clear, this test has unresolved promises
     * that prevent it from completing naturally. Because of this,
     * we handle teardown manually.
     *
     */
    teardownContext(this);
  });
});
