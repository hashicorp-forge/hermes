import { click, teardownContext, visit, waitFor } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import {
  authenticateSession,
  invalidateSession,
} from "ember-simple-auth/test-support";
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
      .hasText("Session expired");

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

  test("the reauthenticate button works as expected (success)", async function (this: ApplicationTestContext, assert) {
    let authCount = 0;
    await authenticateSession({});

    this.session.authenticate = async () => {
      authCount++;
    };

    const warningSelector = "[data-test-flash-notification-type='warning']";
    const successSelector = "[data-test-flash-notification-type='success']";

    await visit("/");

    await invalidateSession();

    await waitFor(warningSelector);

    await click("[data-test-flash-notification-button]");
    await waitFor(successSelector);


    assert
      .dom(warningSelector)
      .doesNotExist("flash notification is dismissed on reauth buttonClick");

    assert
      .dom(successSelector)
      .exists("flash notification is shown on successful re-auth");

    assert
      .dom(`${successSelector} [data-test-flash-notification-title]`)
      .hasText("Login successful");

    assert
      .dom(`${successSelector} [data-test-flash-notification-description]`)
      .hasText("Welcome back, Test!");

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

  test("the reauthenticate button works as expected (failure)", async function (this: ApplicationTestContext, assert) {
    await authenticateSession({});

    this.session.authenticate = async () => {
      throw new Error("Authentication failed");
    };

    const warningSelector = "[data-test-flash-notification-type='warning']";
    const criticalSelector = "[data-test-flash-notification-type='critical']";

    await visit("/");
    await this.session.invalidate();

    await waitFor(warningSelector);

    assert
      .dom(warningSelector)
      .exists("flash notification is shown on session invalidation");

    await click("[data-test-flash-notification-button]");

    await waitFor(criticalSelector);

    assert
      .dom(criticalSelector)
      .exists("flash notification is shown on re-auth failure");

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
