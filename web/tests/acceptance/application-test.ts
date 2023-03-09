import { click, teardownContext, visit, waitFor } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import {
  authenticateSession,
  invalidateSession,
} from "ember-simple-auth/test-support";
import { setupMirage } from "ember-cli-mirage/test-support";
import SessionService from "hermes/services/session";

module("Acceptance | application", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  test("a message shows when the user's auth token expires", async function (assert) {
    const session = this.owner.lookup("service:session") as SessionService;

    let authCount = 0;

    await authenticateSession({});

    session.authenticate = () => {
      authCount++;
    };

    await visit("/");

    assert
      .dom("[data-test-flash-notification]")
      .doesNotExist("no flash notification when session is valid");

    session.handleInvalidation();

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
