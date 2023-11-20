import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { waitUntil } from "@ember/test-helpers";
import LatestDocsService from "hermes/services/latest-docs";

interface LatestDocsServiceContext extends MirageTestContext {
  latestDocs: LatestDocsService;
}

module("Unit | Service | latest", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: LatestDocsServiceContext) {
    this.set("latestDocs", this.owner.lookup("service:latest-docs"));
  });

  test("it fetches latest docs", async function (this: LatestDocsServiceContext, assert) {
    this.server.createList("document", 10);

    assert.equal(this.latestDocs.index, null, "the index is empty");

    await this.latestDocs.fetchAll.perform();

    await waitUntil(() => this.latestDocs.index?.length === 10);
  });
});
