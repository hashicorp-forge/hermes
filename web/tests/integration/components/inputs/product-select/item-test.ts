import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";

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

    test("it functions as expected", async function (this: InputsProductSelectItemContext, assert) {
      this.set("product", "Vault");
      this.set("isSelected", false);

      await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Inputs::ProductSelect::Item
        @product={{this.product}}
        @isSelected={{this.isSelected}}
      />
    `);

      // assert that the icon has the "data-test-icon="vault" attribute
      assert
        .dom("[data-test-product-select-item-icon]")
        .hasAttribute(
          "data-test-icon",
          "vault",
          "the correct product icon is shown"
        );

      assert
        .dom("[data-test-product-select-item-value]")
        .hasText("Vault", "the product name is rendered");

      assert
        .dom("[data-test-product-select-item-abbreviation]")
        .doesNotExist("no abbreviation specified");

      assert
        .dom("[data-test-product-select-item-selected]")
        .doesNotExist("check icon only rendered when selected");

      this.set("product", "Engineering");
      this.set("isSelected", true);

      assert
        .dom("[data-test-product-select-item-icon]")
        .hasAttribute(
          "data-test-icon",
          "folder",
          "the correct product icon is shown"
        );
    });
  }
);
