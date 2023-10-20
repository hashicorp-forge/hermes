import { module, test, todo } from "qunit";
import { setupTest } from "ember-qunit";
import ProductAreasService from "hermes/services/product-areas";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";

module("Unit | Service | product-areas", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateSession({});
  });

  test("can set or close an active modal", async function (this: MirageTestContext, assert) {
    const productAreas = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    this.server.create("product", {
      name: "Labs",
      abbreviation: "LABS",
    });

    await productAreas.fetch.perform();

    const expectedResponse = {
      Labs: {
        abbreviation: "LABS",
      },
    };

    assert.equal(productAreas.index, null);

    await productAreas.fetch.perform();

    assert.deepEqual(productAreas.index, expectedResponse);
  });
});
