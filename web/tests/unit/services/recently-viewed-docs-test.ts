import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedDocsService, {
  RecentlyViewedDoc,
} from "hermes/services/recently-viewed-docs";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { waitUntil } from "@ember/test-helpers";
import MockDate from "mockdate";

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
    MockDate.set("2000-01-01T06:00:00.000-07:00");

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
      /**
       * The Mirage factory sets the modifiedTime to 1 (1970),
       * while we set our MockDate to 2000. That's obviously a 30 year difference,
       * but our `timeAgo` function is inexact, assuming 28-day months, so it computes
       * the difference as 32 years.
       */
      assert.equal(
        recentDoc.doc.modifiedAgo,
        "Modified 32 years ago",
        "modifiedAgo property is added"
      );
    });

    MockDate.reset();
  });
});
