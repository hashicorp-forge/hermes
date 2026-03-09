import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import type { MirageTestContext } from "ember-cli-mirage/test-support";

const VALUE = "[data-test-product-value]";
const ABBREVIATION = "[data-test-product-select-item-abbreviation]";
const PRODUCT_AVATAR = "[data-test-product-avatar]";
const CHECK = "[data-test-check]";
const FOLDER_ICON = "[data-test-icon='folder']";

interface InputsProductSelectItemContext extends MirageTestContext {
  product: string;
  isSelected?: boolean;
  abbreviation?: string;
}

module(
  "Integration | Component | inputs/product-select/item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it functions as expected", async function (this: InputsProductSelectItemContext, assert) {
      this.set("product", "Vault");
      this.set("isSelected", false);

      await render<InputsProductSelectItemContext>(hbs`
      <Inputs::ProductSelect::Item
        @product={{this.product}}
        @isSelected={{this.isSelected}}
      />
    `);

      assert.dom(PRODUCT_AVATAR).exists();
      assert.dom(FOLDER_ICON).doesNotExist();

      assert.dom(VALUE).hasText("Vault", "the product name is rendered");
      assert.dom(ABBREVIATION).doesNotExist("no abbreviation specified");
      assert.dom(CHECK).doesNotExist("check icon only rendered when selected");

      this.set("isSelected", true);

      assert.dom(CHECK).exists();

      this.set("product", undefined);

      assert.dom(PRODUCT_AVATAR).doesNotExist();
      assert.dom(FOLDER_ICON).exists();
    });

    test("it shows an empty state when no product is provided", async function (this: InputsProductSelectItemContext, assert) {
      await render<InputsProductSelectItemContext>(hbs`
        <Inputs::ProductSelect::Item />
      `);

      assert.dom("[data-test-empty-state]").hasText("Select a product/area");
    });

    test("it shows an abbreviation when one exists, unless its the same as the product name", async function (this: InputsProductSelectItemContext, assert) {
      this.set("product", "Vault");
      this.set("abbreviation", "VLT");

      await render<InputsProductSelectItemContext>(hbs`
        <Inputs::ProductSelect::Item
          @product={{this.product}}
          @abbreviation={{this.abbreviation}}
        />
      `);

      assert.dom(ABBREVIATION).hasText("VLT");

      this.set("abbreviation", "Vault");

      assert.dom(ABBREVIATION).doesNotExist();
    });
  },
);
