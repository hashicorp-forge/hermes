import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedService from "hermes/services/recently-viewed";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

interface Context extends MirageTestContext {
  recentlyViewed: RecentlyViewedService;
}

module("Unit | Service | recently-viewed", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    this.set("recentlyViewed", this.owner.lookup("service:recently-viewed"));
  });

  test("it fetches recently viewed items", async function (this: Context, assert) {
    this.server.createList("recently-viewed-doc", 10);
    this.server.createList("document", 10);

    assert.equal(this.recentlyViewed._index, null, "the index is empty");

    await this.recentlyViewed.fetchAll.perform();

    assert.equal(
      this.recentlyViewed._index?.length,
      10,
      "the index is populated",
    );
  });
});
