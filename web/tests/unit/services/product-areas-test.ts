import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import ProductAreasService from "hermes/services/product-areas";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";

interface ProductAreasServiceTestContext extends MirageTestContext {
  productAreas: ProductAreasService;
}

module("Unit | Service | product-areas", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateSession({});
    const productAreas = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    this.set("productAreas", productAreas);
  });

  test("it fetches product areas from the back end", async function (this: ProductAreasServiceTestContext, assert) {
    const key = "Labs";
    const abbreviation = "LABS";

    this.server.create("product", {
      name: key,
      abbreviation,
    });

    await this.productAreas.fetch.perform();

    assert.equal(Object.keys(this.productAreas.index)[0], key);

    assert.equal(
      Object.values(this.productAreas.index)[0]?.abbreviation,
      abbreviation,
    );
  });

  test("it returns a product abbreviation if it exists", async function (this: ProductAreasServiceTestContext, assert) {
    const key = "Labs";
    const abbreviation = "LABS";

    this.server.create("product", {
      name: key,
      abbreviation,
    });

    await this.productAreas.fetch.perform();

    assert.equal(this.productAreas.getAbbreviation(key), abbreviation);
    assert.equal(this.productAreas.getAbbreviation("foo"), undefined);
    assert.equal(this.productAreas.getAbbreviation(), undefined);
  });

  test("it returns a product color if the product exists", async function (this: ProductAreasServiceTestContext, assert) {
    this.server.create("product", {
      name: "Labs",
    });

    await this.productAreas.fetch.perform();

    assert.true(this.productAreas.getProductColor("Labs")?.startsWith("#"));
    assert.equal(this.productAreas.getProductColor(), undefined);
  });
});
