import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import RouterService from "@ember/routing/router-service";
// import { getPageTitle } from "ember-page-title/test-support";

// const PRODUCT_BADGE_LINK_SELECTOR = ".product-badge-link";
// const TABLE_HEADER_CREATED_SELECTOR =
//   "[data-test-sortable-table-header][data-test-attribute=createdTime]";

interface AuthenticatedAllRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/all", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  // test("documents can be sorted by created date", async function (this: AuthenticatedAllRouteTestContext, assert) {
  //   this.server.createList("document", 2);

  //   await visit("/all");

  //   assert
  //     .dom(TABLE_HEADER_CREATED_SELECTOR)
  //     .hasClass("active")
  //     .hasAttribute("href", "/all?sortBy=dateAsc");

  //   assert
  //     .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
  //     .hasAttribute("data-test-icon", "arrow-down");

  //   await click(TABLE_HEADER_CREATED_SELECTOR);

  //   assert
  //     .dom(TABLE_HEADER_CREATED_SELECTOR)
  //     .hasClass("active")
  //     .hasAttribute("href", "/all");

  //   assert
  //     .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
  //     .hasAttribute("data-test-icon", "arrow-up");
  // });

  // test("product badges have the correct hrefs", async function (this: AuthenticatedAllRouteTestContext, assert) {
  //   this.server.create("document", {
  //     product: "Labs",
  //   });

  //   await visit("/all");

  //   assert
  //     .dom(PRODUCT_BADGE_LINK_SELECTOR)
  //     .hasAttribute("href", "/all?product=%5B%22Labs%22%5D");
  // });

  test("it redirects to the documents route", async function (this: AuthenticatedAllRouteTestContext, assert) {
    await visit("/all");

    const routerService = this.owner.lookup("service:router") as RouterService;

    assert.equal(routerService.currentRouteName, "authenticated.documents");
  });
});
