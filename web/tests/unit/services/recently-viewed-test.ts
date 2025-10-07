import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedService from "hermes/services/recently-viewed";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { TEST_USER_2_EMAIL } from "hermes/mirage/utils";

interface Context extends MirageTestContext {
  recentlyViewed: RecentlyViewedService;
}

module("Unit | Service | recently-viewed", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    authenticateSession({ access_token: "test-token" });
    this.set("recentlyViewed", this.owner.lookup("service:recently-viewed"));
  });

  test("it fetches recently viewed items", async function (this: Context, assert) {
    // Don't create documents separately - the factory will create them
    this.server.createList("recently-viewed-doc", 10);

    assert.equal(this.recentlyViewed.index, undefined, "the index is empty");

    await this.recentlyViewed.fetchAll.perform();

    assert.equal(
      this.recentlyViewed.index?.length,
      10,
      "the index is populated",
    );
  });

  test("it ignores errors when fetching the index", async function (this: Context, assert) {
    // Create a document that the user does not have access to
    this.server.create("document", { id: 1, owners: [TEST_USER_2_EMAIL] });
    this.server.create("recently-viewed-doc", {
      id: 1,
    });

    // Create documents that the user has access to
    this.server.createList("recently-viewed-doc", 5);

    await this.recentlyViewed.fetchAll.perform();

    assert.equal(
      this.recentlyViewed.index?.length,
      5,
      "the inaccessible document is ignored",
    );
  });
});
