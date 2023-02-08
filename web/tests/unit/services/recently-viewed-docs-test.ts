import { module, test, todo } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { waitUntil } from "@ember/test-helpers";

interface RecentlyViewedDocsContext extends MirageTestContext {
  recentDocs: RecentlyViewedDocsService;
}

module("Unit | Service | recently-viewed-docs", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    this.set("recentDocs", this.owner.lookup("service:recently-viewed-docs"));
  });

  test("it adds documents to an index", async function (this: RecentlyViewedDocsContext, assert) {
    this.server.create("recently-viewed-docs-database");
    this.server.create("recently-viewed-doc", { id: "doc1" });
    assert.equal(this.recentDocs.all, null);
    await this.recentDocs.markViewed.perform("doc2");
    await waitUntil(() => this.recentDocs.all, { timeout: 1000 });
    assert.equal(this.recentDocs.all?.length, 1);
  });
});
