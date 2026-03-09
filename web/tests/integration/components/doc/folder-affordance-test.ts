import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { render } from "@ember/test-helpers";
import type { TestContext } from "@ember/test-helpers";

interface DocFolderAffordanceTestContext extends TestContext {
  size?: "large";
}

module("Integration | Component | doc/folder-affordance", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    this.set("size", undefined);

    await render<DocFolderAffordanceTestContext>(hbs`
      <Doc::FolderAffordance @size={{this.size}} />
    `);

    assert
      .dom("[data-test-doc-thumbnail-folder-affordance]")
      .hasAttribute(
        "viewBox",
        "0 0 43 63",
        "the default size renders as expected",
      );

    this.set("size", "large");

    assert
      .dom("[data-test-doc-thumbnail-folder-affordance]")
      .hasAttribute(
        "viewBox",
        "0 0 97 145",
        "the large size renders as expected",
      );
  });
});
