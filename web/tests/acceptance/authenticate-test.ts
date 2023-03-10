import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

module("Acceptance | authenticate", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  test("the page title is correct", async function (this: MirageTestContext, assert) {
    this.server.create("me");

    await visit("/authenticate");
    assert.equal(getPageTitle(), "Authenticate | Hermes");
  });
});
