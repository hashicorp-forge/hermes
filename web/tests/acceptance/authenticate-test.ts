import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

interface AuthenticateRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticate", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  test("the page title is correct", async function (this: AuthenticateRouteTestContext, assert) {
    await visit("/authenticate");
    assert.equal(getPageTitle(), "Authenticate | Hermes");
  });

  test('the footer has the compact class', async function (this: AuthenticateRouteTestContext, assert) {
    await visit("/authenticate");
    assert.dom(".footer").hasClass("compact");
  });
});
