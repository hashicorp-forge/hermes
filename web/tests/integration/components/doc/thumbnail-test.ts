import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { render } from "@ember/test-helpers";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

const THUMBNAIL = "[data-test-doc-thumbnail]";
const PRODUCT_BADGE = "[data-test-doc-thumbnail-product-badge]";
const FOLDER = "[data-test-doc-thumbnail-folder-affordance]";
const STATUS_ICON = "[data-test-doc-status-icon]";

interface DocThumbnailTestContext extends MirageTestContext {
  size?: "large";
  status?: string;
  product?: string;
}

module("Integration | Component | doc/thumbnail", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: DocThumbnailTestContext) {
    this.server.create("product", {
      name: "Labs",
      abbreviation: "LAB",
    });

    this.server.create("product", {
      name: "Terraform",
      abbreviation: "TF",
    });

    await setupProductIndex(this);
  });

  test("it renders at different sizes", async function (this: DocThumbnailTestContext, assert) {
    this.set("size", undefined);

    await render<DocThumbnailTestContext>(hbs`
      <Doc::Thumbnail
        @size={{this.size}}
        @product="Labs"
      />
    `);

    assert.dom(THUMBNAIL).hasClass("small");

    this.set("size", "medium");

    assert.dom(THUMBNAIL).hasClass("medium");

    this.set("size", "large");

    assert.dom(THUMBNAIL).hasClass("large");

    this.set("size", "small");

    assert.dom(THUMBNAIL).hasClass("small");
  });

  test("it renders status affordances", async function (this: DocThumbnailTestContext, assert) {
    this.set("status", "In-Review");
    this.set("product", "Labs");

    await render<DocThumbnailTestContext>(hbs`
      <Doc::Thumbnail
        @status={{this.status}}
        @product="Terraform"
      />
    `);

    assert.dom(THUMBNAIL).doesNotHaveClass("obsolete");

    assert.dom(FOLDER).doesNotExist();
    assert.dom(STATUS_ICON).doesNotExist();

    this.set("status", "Approved");

    assert.dom(`${STATUS_ICON}.approved`).exists("approved icon is shown");

    this.set("status", "Obsolete");

    assert.dom(`${STATUS_ICON}.obsolete`).exists("obsolete icon is shown");
    assert.dom(FOLDER).exists("folder affordance is shown");
    assert.dom(THUMBNAIL).hasClass("obsolete", "obsolete class is added");

    assert.dom(PRODUCT_BADGE).exists("product badge is shown");
  });

  test("the badge is conditionally shown", async function (this: DocThumbnailTestContext, assert) {
    this.set("product", undefined);

    await render<DocThumbnailTestContext>(hbs`
      <Doc::Thumbnail
        @product={{this.product}}
      />
    `);

    assert
      .dom(PRODUCT_BADGE)
      .doesNotExist(
        "badge not shown for a product without an icon or abbreviation",
      );

    this.set("product", "Terraform");

    assert
      .dom(PRODUCT_BADGE)
      .exists("badge is shown for a product with an icon");

    // Config is not tracked by glimmer, so we force
    // a re-compute on the "badgeIsShown" getter
    this.set("product", undefined);
    this.set("product", "Labs");

    assert
      .dom(PRODUCT_BADGE)
      .exists("badge is shown for a product with an abbreviation");

    // Set an unknown product
    this.set("product", "Fake Product");

    assert
      .dom(PRODUCT_BADGE)
      .doesNotExist(
        "badge not shown for a product without an icon or abbreviation",
      );
  });
});
