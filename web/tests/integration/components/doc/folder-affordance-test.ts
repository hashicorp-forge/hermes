import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { render } from "@ember/test-helpers";

module("Integration | Component | doc/folder-affordance", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    this.set("isLarge", false);
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Doc::FolderAffordance
        @isLarge={{this.isLarge}}
      />
    `);

    assert
      .dom("[data-test-doc-thumbnail-folder-affordance]")
      .hasAttribute("viewBox", "0 0 43 63");

    this.set("isLarge", true);

    assert
      .dom("[data-test-doc-thumbnail-folder-affordance]")
      .hasAttribute(
        "viewBox",
        "0 0 97 145",
        "the `isLarge` attribute is passed to the component"
      );
  });
});
