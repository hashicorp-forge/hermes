import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedService from "hermes/services/recently-viewed";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

interface Context extends MirageTestContext {
  viewedDocs: RecentlyViewedService;
}

module("Unit | Service | recently-viewed", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    this.set("viewedDocs", this.owner.lookup("service:recently-viewed"));
  });

  test("it fetches recently viewed docs", async function (this: Context, assert) {
    this.server.createList("recently-viewed-doc", 10);
    // TODO: need recently viewed project
    this.server.createList("document", 10);

    assert.equal(this.viewedDocs.all, null, "the index is empty");

    await this.viewedDocs.fetchAll.perform();
  });
});
