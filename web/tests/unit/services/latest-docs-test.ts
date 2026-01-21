import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { waitUntil } from "@ember/test-helpers";
import { authenticateSession } from "ember-simple-auth/test-support";
import LatestDocsService from "hermes/services/latest-docs";

interface Context extends MirageTestContext {
  latestDocs: LatestDocsService;
}

module("Unit | Service | latest", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    authenticateSession({ access_token: "test-token" });
    this.set("latestDocs", this.owner.lookup("service:latest-docs"));
  });

  test("it fetches latest docs", async function (this: Context, assert) {
    this.server.createList("document", 10);

    assert.equal(this.latestDocs.index, null, "the index is empty");

    await this.latestDocs.fetchAll.perform();

    await waitUntil(() => this.latestDocs.index?.length === 10);
  });
});
