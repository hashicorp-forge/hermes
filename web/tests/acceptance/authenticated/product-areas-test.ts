import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { currentURL, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { getPageTitle } from "ember-page-title/test-support";

const FLASH_MESSAGE = "[data-test-flash-notification]";

interface AuthenticatedProductAreasRouteTestContext extends MirageTestContext {}
module("Acceptance | authenticated/projects", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("it redirects if the product area does not exist", async function (this: AuthenticatedProductAreasRouteTestContext, assert) {
    await visit("/product-areas/does-not-exist");

    assert.equal(currentURL(), "/dashboard");

    assert.dom(FLASH_MESSAGE).exists();
  });

  test("it redirects when trying to access the product-areas index", async function (this: AuthenticatedProductAreasRouteTestContext, assert) {
    await visit("/product-areas");

    assert.equal(currentURL(), "/dashboard");

    assert.dom(FLASH_MESSAGE).exists();
  });

  test("the page title is correct", async function (this: AuthenticatedProductAreasRouteTestContext, assert) {
    await visit("/product-areas/terraform");

    assert.equal(getPageTitle(), "Terraform | Hermes");
  });

  test("it shows an empty state if the product/area has no docs", async function (this: AuthenticatedProductAreasRouteTestContext, assert) {});
});
