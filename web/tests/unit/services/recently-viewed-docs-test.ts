import { module, test, todo } from "qunit";
import { setupTest } from "ember-qunit";
import RecentlyViewedDocsService, {
  RecentlyViewedDoc,
} from "hermes/services/recently-viewed-docs";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { waitUntil } from "@ember/test-helpers";
import { assert as emberAssert } from "@ember/debug";

interface RecentlyViewedDocsContext extends MirageTestContext {
  recentDocs: RecentlyViewedDocsService;
}

module("Unit | Service | recently-viewed-docs", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    this.set("recentDocs", this.owner.lookup("service:recently-viewed-docs"));
  });

  test("it adds viewed documents to an index in the expected order", async function (this: RecentlyViewedDocsContext, assert) {
    this.server.create("recently-viewed-docs-database");
    this.server.createList("document", 10);
    assert.equal(this.recentDocs.all, null, "the index is empty");
    await this.recentDocs.markViewed.perform("doc-1");
    await waitUntil(() => this.recentDocs.all?.length === 1);
    assert.equal(
      this.recentDocs.all?.length,
      1,
      "The document was added to the index"
    );

    await this.recentDocs.markViewed.perform("doc-2");
    await waitUntil(() => this.recentDocs.all?.length === 2);
    let recentDocIDs = this.recentDocs.all?.map(
      (recentDoc) => recentDoc.doc.objectID
    );
    assert.equal(
      recentDocIDs?.toString(),
      "doc-2,doc-1",
      "the docs are in the correct order"
    );
    await this.recentDocs.markViewed.perform("doc-1");

    await waitUntil(() => {
      emberAssert("this.recentDocs.all must be defined", this.recentDocs.all);
      return (
        (this.recentDocs.all[0] as RecentlyViewedDoc).doc.objectID === "doc-1"
      );
    });
    recentDocIDs = this.recentDocs.all?.map(
      (recentDoc) => recentDoc.doc.objectID
    );
    assert.equal(
      recentDocIDs?.toString(),
      "doc-1,doc-2",
      "the docs are in the correct order"
    );

    await this.recentDocs.markViewed.perform("doc-3");
    await this.recentDocs.markViewed.perform("doc-4");
    await this.recentDocs.markViewed.perform("doc-5");

    await waitUntil(() => this.recentDocs.all?.length === 4);
    assert.equal(
      this.recentDocs.all?.length,
      4,
      "the index has a maximum of 4 items"
    );
  });

  test("it handles legacy users", async function (this: RecentlyViewedDocsContext, assert) {
    this.server.create("recently-viewed-docs-database");
    this.server.createList("document", 4);
    this.server.createList("recently-viewed-doc", 4, { isLegacy: true });
    await this.recentDocs.fetchAll.perform();

    assert.equal(this.recentDocs.all?.length, 4);
    assert.equal(
      this.recentDocs.all?.every((recentDoc) => recentDoc.doc),
      true,
      'the index was transformed from a list of strings to a list of objects with "doc" properties'
    );
  });
});
