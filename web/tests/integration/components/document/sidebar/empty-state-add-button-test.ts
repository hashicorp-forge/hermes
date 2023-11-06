import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface DocumentSidebarEmptyStateAddButtonTestContext extends TestContext {
  action: () => void;
  isReadOnly: boolean;
}

module(
  "Integration | Component | document/sidebar/empty-state-add-button",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it runs the passed-in function on click", async function (this: DocumentSidebarEmptyStateAddButtonTestContext, assert) {
      let count = 0;

      this.set("action", () => {
        count++;
      });

      await render<DocumentSidebarEmptyStateAddButtonTestContext>(hbs`
        <Document::Sidebar::EmptyStateAddButton
          @action={{this.action}}
        />
      `);

      await click("button");

      assert.equal(count, 1);
    });

    test("it can be rendered read-only", async function (this: DocumentSidebarEmptyStateAddButtonTestContext, assert) {
      this.set("action", () => {});

      await render<DocumentSidebarEmptyStateAddButtonTestContext>(hbs`
        <Document::Sidebar::EmptyStateAddButton
          @isReadOnly={{true}}
          @action={{this.action}}
        />
      `);

      assert.dom("button").doesNotExist();
      assert.dom(".field-toggle").hasClass("read-only");
    });
  },
);
