import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { currentURL, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { getPageTitle } from "ember-page-title/test-support";

const FLASH_MESSAGE = "[data-test-flash-notification]";
const EMPTY_STATE = "[data-test-product-area-empty-state]";
const SEE_MORE_BUTTON = "[data-test-see-more-button]";
const DOC = "[data-test-product-area-document]";

interface AuthenticatedProductAreaRouteTestContext extends MirageTestContext {}
module(
  "Acceptance | authenticated/product-areas/product-area",
  function (hooks) {
    setupApplicationTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (
      this: AuthenticatedProductAreaRouteTestContext,
    ) {
      await authenticateSession({});

      this.server.create("product", {
        name: "Terraform",
      });
    });

    test("it redirects if the product area does not exist", async function (this: AuthenticatedProductAreaRouteTestContext, assert) {
      await visit("/product-areas/does-not-exist");

      assert.equal(currentURL(), "/dashboard");

      assert.dom(FLASH_MESSAGE).exists();
    });

    test("the page title is correct", async function (this: AuthenticatedProductAreaRouteTestContext, assert) {
      await visit("/product-areas/terraform");

      assert.equal(getPageTitle(), "Terraform | Hermes");
    });

    test("it can render an empty state", async function (this: AuthenticatedProductAreaRouteTestContext, assert) {
      await visit("/product-areas/terraform");

      assert.dom(EMPTY_STATE).exists();
    });

    test("it can render documents", async function (this: AuthenticatedProductAreaRouteTestContext, assert) {
      this.server.createList("document", 12, {
        product: "Terraform",
      });

      await visit("/product-areas/terraform");

      assert.dom(DOC).exists({ count: 12 });

      assert
        .dom(SEE_MORE_BUTTON)
        .doesNotExist(
          "the see more button is not shown for product areas with 12 or fewer docs",
        );
    });

    test(`it can render a "see more" button`, async function (this: AuthenticatedProductAreaRouteTestContext, assert) {
      this.server.createList("document", 13, {
        product: "Terraform",
      });

      await visit("/product-areas/terraform");

      assert.dom(DOC).exists({ count: 12 });

      assert
        .dom(SEE_MORE_BUTTON)
        .exists(
          "the see more button is shown for product areas with more than 12 docs",
        );

      assert
        .dom(SEE_MORE_BUTTON)
        .hasAttribute(
          "href",
          "/documents?page=2&product=%5B%22Terraform%22%5D",
        );
    });
  },
);
