import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedDocsService, {
  RecentlyViewedDoc,
} from "hermes/services/recently-viewed-docs";
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

  test("it fetches recently viewed docs", async function (this: RecentlyViewedDocsContext, assert) {
    this.server.createList("recently-viewed-doc", 10);
    this.server.createList("document", 10);

    assert.equal(this.recentDocs.all, null, "the index is empty");

    await this.recentDocs.fetchAll.perform();

    await waitUntil(() => this.recentDocs.all?.length === 4);

    assert.equal(
      this.recentDocs.all?.length,
      4,
      "recently viewed docs retrieved and trimmed to 4"
    );

    this.recentDocs.all?.forEach((recentDoc: RecentlyViewedDoc) => {
      assert.equal(
        recentDoc.doc.modifiedAgo,
        "Modified 1 second ago",
        "modifiedAgo property is added"
      );
    });
  });
});
