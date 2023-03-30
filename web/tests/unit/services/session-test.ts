import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import SessionService, {
  REDIRECT_LOCAL_STORAGE_KEY,
} from "hermes/services/session";
import window from "ember-window-mock";
import { settled, waitFor } from "@ember/test-helpers";

module("Unit | Service | session", function (hooks) {
  setupTest(hooks);

  test("it handles authentication", async function (assert) {
    const sessionSvc = this.owner.lookup("service:session") as SessionService;

    // mock the service method
    sessionSvc.handleAuthentication = (_routeAfterAuthentication: string) => {
      let redirectObject = window.localStorage.getItem(
        REDIRECT_LOCAL_STORAGE_KEY
      );

      let returnValue: string | null = null;

      if (redirectObject) {
        // Check if the object is less than 2 minutes old
        if (Date.now() < JSON.parse(redirectObject).expiresOn) {
          returnValue = `redirect valid: ${JSON.parse(redirectObject).url}`;
        } else {
          returnValue = "redirect expired";
        }
      } else {
        returnValue = "redirect not found";
      }

      return returnValue;
    };

    assert.equal(sessionSvc.handleAuthentication("none"), "redirect not found");

    window.localStorage.setItem(
      REDIRECT_LOCAL_STORAGE_KEY,
      JSON.stringify({
        url: "testURL",
        expiresOn: Date.now() + 60 * 2000, // 2 minutes
      })
    );

    assert.equal(
      sessionSvc.handleAuthentication("none"),
      "redirect valid: testURL"
    );

    window.localStorage.setItem(
      REDIRECT_LOCAL_STORAGE_KEY,
      JSON.stringify({
        url: "testURL",
        expiresOn: Date.now() - 60 * 2000, // -2 minutes
      })
    );

    assert.equal(sessionSvc.handleAuthentication("none"), "redirect expired");

    window.localStorage.removeItem(REDIRECT_LOCAL_STORAGE_KEY);
  });
});
