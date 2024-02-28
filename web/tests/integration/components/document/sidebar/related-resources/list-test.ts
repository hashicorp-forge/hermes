import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface DocumentSidebarRelatedResourcesListTestContext extends TestContext {
  items: any;
}

module(
  "Integration | Component | document/sidebar/related-resources/list",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it renders as expected", async function (this: DocumentSidebarRelatedResourcesListTestContext, assert) {
      this.set("items", ["one", "two", "three"]);

      await render<DocumentSidebarRelatedResourcesListTestContext>(hbs`
      <Document::Sidebar::RelatedResources::List
        @items={{this.items}}
      >
        <:resource as |r|>
          {{r}}
        </:resource>
      </Document::Sidebar::RelatedResources::List>
    `);

      assert.dom(".related-resources-list").exists("list is rendered");
    });

    test("it shows an empty state when the list is empty", async function (this: DocumentSidebarRelatedResourcesListTestContext, assert) {
      this.set("items", []);

      await render<DocumentSidebarRelatedResourcesListTestContext>(hbs`
      <Document::Sidebar::RelatedResources::List
        @items={{this.items}}
      >
        <:resource as |r|>
          {{r}}
        </:resource>
      </Document::Sidebar::RelatedResources::List>
    `);

      assert.dom("[data-test-related-resources-list-empty-state]").exists();
    });
  },
);
