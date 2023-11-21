import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

interface RecentlyViewedDocsContext extends MirageTestContext {
  viewedDocs: RecentlyViewedDocsService;
}

module("Unit | Service | recently-viewed-docs", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: RecentlyViewedDocsContext) {
    this.set("viewedDocs", this.owner.lookup("service:recently-viewed-docs"));
  });

  test("it fetches recently viewed docs", async function (this: RecentlyViewedDocsContext, assert) {
    this.server.createList("recently-viewed-doc", 10);
    this.server.createList("document", 10);

    assert.equal(this.viewedDocs.all, null, "the index is empty");

    await this.viewedDocs.fetchAll.perform();
  });
});
