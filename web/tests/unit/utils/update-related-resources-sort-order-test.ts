import { module, test } from "qunit";
import updateRelatedResourcesSortOrder from "hermes/utils/update-related-resources-sort-order";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupTest } from "ember-qunit";

module(
  "Unit | Utility | update-related-resources-sort-order",
  function (this: MirageTestContext, hooks) {
    setupTest(hooks);
    setupMirage(hooks);

    test("it updates the relative sortOrder of related resources", function (this: MirageTestContext, assert) {
      this.server.create("related-hermes-document", { sortOrder: 20 });
      this.server.create("related-hermes-document", { sortOrder: 10 });
      this.server.create("related-external-link", { sortOrder: 40 });
      this.server.create("related-external-link", { sortOrder: 30 });

      const hermesDocuments =
        this.server.schema.relatedHermesDocument.all().models;

      const externalLinks =
        this.server.schema.relatedExternalLinks.all().models;

      assert.equal(hermesDocuments[0].sortOrder, 20);
      assert.equal(hermesDocuments[1].sortOrder, 10);
      assert.equal(externalLinks[0].sortOrder, 40);
      assert.equal(externalLinks[1].sortOrder, 30);

      updateRelatedResourcesSortOrder(hermesDocuments, externalLinks);

      assert.equal(hermesDocuments[0].sortOrder, 1);
      assert.equal(hermesDocuments[1].sortOrder, 2);
      assert.equal(externalLinks[0].sortOrder, 3);
      assert.equal(externalLinks[1].sortOrder, 4);
    });
  },
);
