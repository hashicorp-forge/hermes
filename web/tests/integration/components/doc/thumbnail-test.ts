import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { TestContext, render } from "@ember/test-helpers";

interface DocThumbnailTestContext extends TestContext {
  size?: "large";
  status?: string;
  product?: string;
}

module("Integration | Component | doc/thumbnail", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    this.set("size", undefined);
    this.set("status", "In Review");
    this.set("product", "Labs");

    await render<DocThumbnailTestContext>(hbs`
      <Doc::Thumbnail
        @size={{this.size}}
        @status={{this.status}}
        @product={{this.product}}
      />
    `);

    assert
      .dom("[data-test-doc-thumbnail]")
      .exists()
      .doesNotHaveClass("large")
      .doesNotHaveClass("obsolete");

    assert.dom("[data-test-doc-thumbnail-folder-affordance]").doesNotExist();
    assert.dom("[data-test-doc-status-icon]").doesNotExist();
    assert.dom("[data-test-doc-thumbnail-product-badge]").doesNotExist();

    this.set("size", "large");

    assert
      .dom("[data-test-doc-thumbnail]")
      .hasClass("large", "large class is added");

    this.set("status", "Approved");

    assert
      .dom("[data-test-doc-status-icon].approved")
      .exists("approved icon is shown");

    this.set("status", "Obsolete");

    assert
      .dom("[data-test-doc-status-icon].obsolete")
      .exists("obsolete icon is shown");

    assert
      .dom("[data-test-doc-thumbnail-folder-affordance]")
      .exists("folder affordance is shown");

    assert
      .dom("[data-test-doc-thumbnail]")
      .hasClass("obsolete", "obsolete class is added");

    this.set("product", "Waypoint");

    assert
      .dom("[data-test-doc-thumbnail-product-badge].waypoint")
      .exists("product badge is shown");
  });
});
