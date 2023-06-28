import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

interface AuthenticatedNewDocRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/new/doc", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: AuthenticatedNewDocRouteTestContext) {
    await authenticateSession({});
  });

  test("the page title is correct (RFC)", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    await visit("/new/doc?docType=RFC");
    assert.equal(getPageTitle(), "Create Your RFC | Hermes");
  });

  test("the page title is correct (PRD)", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    await visit("/new/doc?docType=PRD");
    assert.equal(getPageTitle(), "Create Your PRD | Hermes");
  });

  test("the product/area can be set", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 4);

    // add a product with an icon
    this.server.create("product", {
      name: "Terraform",
      abbreviation: "TF",
    });

    await visit("/new/doc?docType=RFC");

    const toggleSelector = "[data-test-x-dropdown-list-toggle-action]";
    const thumbnailBadgeSelector = "[data-test-doc-thumbnail-product-badge]";

    assert.dom(toggleSelector).exists();
    assert.dom(`${toggleSelector} span`).hasText("Select a product/area");
    assert
      .dom(`${toggleSelector} .flight-icon`)
      .hasAttribute("data-test-icon", "folder");

    assert
      .dom(thumbnailBadgeSelector)
      .doesNotExist("badge not shown unless a product shortname exists");

    await click(toggleSelector);

    const listItemSelector = "[data-test-x-dropdown-list-item]";
    const lastItemSelector = `${listItemSelector}:last-child`;

    assert.dom(listItemSelector).exists({ count: 5 });
    assert.dom(lastItemSelector).hasText("Terraform TF");
    assert
      .dom(lastItemSelector + " .flight-icon")
      .hasAttribute("data-test-icon", "terraform");

    await click(lastItemSelector + " button");

    assert.dom(toggleSelector).hasText("Terraform TF");
    assert
      .dom(toggleSelector + " .flight-icon")
      .hasAttribute("data-test-icon", "terraform");
    assert.dom(thumbnailBadgeSelector).exists();
  });
});
