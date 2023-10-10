import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import ProductAreasService from "hermes/services/product-areas";

const VALUE = "[data-test-selected-value]";
const ABBREVIATION = "[data-test-product-select-item-abbreviation]";
const PRODUCT_AVATAR = "[data-test-product-avatar]";
const CHECK = "[data-test-check]";

const VALUE = "[data-test-selected-value]";
const ABBREVIATION = "[data-test-product-select-item-abbreviation]";
const PRODUCT_ICON = "[data-test-product-icon]";
const CHECK = "[data-test-check]";

interface InputsProductSelectItemContext extends MirageTestContext {
  product: string;
  isSelected?: boolean;
  abbreviation?: boolean;
}

module(
  "Integration | Component | inputs/product-select/item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (this: InputsProductSelectItemContext) {
      const productAreasService = this.owner.lookup(
        "service:product-areas",
      ) as ProductAreasService;

      this.server.createList("product", 4);

      await productAreasService.fetch.perform();
    });

    test("it functions as expected", async function (this: InputsProductSelectItemContext, assert) {
      this.set("product", "Vault");
      this.set("isSelected", false);

      await render<InputsProductSelectItemContext>(hbs`
      <Inputs::ProductSelect::Item
        @product={{this.product}}
        @isSelected={{this.isSelected}}
      />
    `);

      assert
        .dom(PRODUCT_AVATAR)
        .hasAttribute(
          "data-test-icon",
          "vault",
          "the correct product icon is shown",
        );

      assert.dom(VALUE).hasText("Vault", "the product name is rendered");
      assert.dom(ABBREVIATION).doesNotExist("no abbreviation specified");
      assert.dom(CHECK).doesNotExist("check icon only rendered when selected");

      this.set("product", "Engineering");
      this.set("isSelected", true);

      assert
        .dom(`${PRODUCT_AVATAR} .flight-icon`)
        .hasAttribute(
          "data-test-icon",
          "folder",
          "the correct product icon is shown",
        );
    });

    test("it shows an empty state when no product is provided", async function (this: InputsProductSelectItemContext, assert) {
      await render<InputsProductSelectItemContext>(hbs`
        <Inputs::ProductSelect::Item />
      `);

      assert.dom("[data-test-empty-state]").hasText("Select a product/area");
    });
  },
);
