import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import ProductAreasService from "hermes/services/product-areas";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render } from "@ember/test-helpers";

interface DocThumbnailTestContext extends MirageTestContext {
  size?: "large";
  status?: string;
  product?: string;
}

module("Integration | Component | doc/thumbnail", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: DocThumbnailTestContext) {
    const productAreasService = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    this.server.create("product", {
      name: "Labs",
      abbreviation: "LAB",
    });

    await productAreasService.fetch.perform();
  });

  test("it renders as expected", async function (this: DocThumbnailTestContext, assert) {
    this.set("isLarge", false);
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

    assert.dom("[data-test-doc-thumbnail-product-badge]").hasText("LAB");

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
      .exists("product icon is shown");
  });
});
