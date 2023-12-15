import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";

interface Context extends MirageTestContext {}

module("Acceptance | authenticated/chat", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {
    await authenticateSession({});
    // populate the db with some docs

    this.server.createList("document", 10);

    this.server.create("document", {
      title: "XYZ",
    });
  });

  test("the page title is correct", async function (this: Context, assert) {
    await visit("/chat");

    await this.pauseTest();
  });
});
