import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import SessionService, {
  REDIRECT_STORAGE_KEY,
  isJSON,
} from "hermes/services/session";
import window from "ember-window-mock";

const TEST_STORAGE_KEY = `test-${REDIRECT_STORAGE_KEY}`;

module("Unit | Service | session", function (hooks) {
  setupTest(hooks);

  hooks.afterEach(function () {
    window.sessionStorage.removeItem(TEST_STORAGE_KEY);
    window.localStorage.removeItem(TEST_STORAGE_KEY);
  });

  test("it handles authentication", async function (assert) {
    const sessionSvc = this.owner.lookup("service:session") as SessionService;

    /**
     * Mock the handleAuthentication method
     */

    sessionSvc.handleAuthentication = (_routeAfterAuthentication: string) => {
      // See if there is a redirect object in sessionStorage
      let redirectObject = window.sessionStorage.getItem(TEST_STORAGE_KEY);

      // If there's no redirect object in sessionStorage, check localStorage
      if (!redirectObject) {
        redirectObject = window.localStorage.getItem(TEST_STORAGE_KEY);

        if (
          // Handle if there's an object but it's expired
          redirectObject &&
          Date.now() > JSON.parse(redirectObject).expiresOn
        ) {
          window.localStorage.removeItem(TEST_STORAGE_KEY);
          redirectObject = null;
        }
      }

      let returnValue: string | null = null;

      if (redirectObject) {
        if (!isJSON(redirectObject)) {
          returnValue = `session-stored redirect: ${redirectObject}`;
        } else if (Date.now() < JSON.parse(redirectObject).expiresOn) {
          returnValue = `locally-stored redirect: ${
            JSON.parse(redirectObject).url
          }`;
        }
      } else {
        returnValue = "redirect not found";
      }

      return returnValue;
    };

    /**
     * Start assertions
     */

    assert.equal(sessionSvc.handleAuthentication("none"), "redirect not found");

    window.sessionStorage.setItem(TEST_STORAGE_KEY, "testURL");
    window.localStorage.setItem(
      TEST_STORAGE_KEY,
      JSON.stringify({
        url: "testURL",
        expiresOn: Date.now() + 60 * 5000,
      })
    );

    assert.equal(
      sessionSvc.handleAuthentication("none"),
      "session-stored redirect: testURL",
      "redirects from sessionStorage when possible"
    );

    window.sessionStorage.removeItem(TEST_STORAGE_KEY);

    assert.equal(
      sessionSvc.handleAuthentication("none"),
      "locally-stored redirect: testURL",
      "redirects from localStorage when sessionStorage is empty"
    );

    window.localStorage.setItem(
      TEST_STORAGE_KEY,
      JSON.stringify({
        url: "testURL",
        expiresOn: Date.now() - 1,
      })
    );

    assert.equal(sessionSvc.handleAuthentication("none"), "redirect not found");

    assert.equal(
      window.localStorage.getItem(TEST_STORAGE_KEY),
      null,
      "expired redirects are removed from localStorage"
    );
  });
});
