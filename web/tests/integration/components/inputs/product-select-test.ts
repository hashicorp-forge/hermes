import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";
import { Response } from "miragejs";
import ProductAreasService from "hermes/services/product-areas";

const TOGGLE = "[data-test-x-dropdown-list-toggle-select]";
const DROPDOWN_PRODUCT =
  "[data-test-x-dropdown-list-content] [data-test-product-select-item]";

interface InputsProductSelectContext extends MirageTestContext {
  selected?: any;
  onChange: (value: string) => void;
  formatIsBadge?: boolean;
  placement?: Placement;
  isSaving?: boolean;
}

module("Integration | Component | inputs/product-select", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: InputsProductSelectContext) {
    this.server.createList("product", 3);
    this.server.create("product", {
      name: "Vault",
      abbreviation: "VLT",
    });

    this.set("selected", "Vault");
    this.set("onChange", (value: string) => {
      this.set("selected", value);
    });

    const productAreasService = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    await productAreasService.fetch.perform();
  });

  test("it displays the products with abbreviations", async function (this: InputsProductSelectContext, assert) {
    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        data-test-content
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);

    assert.dom(TOGGLE).hasText("Vault VLT");

    await click(TOGGLE);

    assert.dom(DROPDOWN_PRODUCT).exists({ count: 4 });
    assert.dom(DROPDOWN_PRODUCT).containsText("Test Product 0 TP0");
  });

  test("it performs the passed-in action on click", async function (this: InputsProductSelectContext, assert) {
    let count = 0;
    this.set("onChange", () => {
      count++;
    });

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);

    await click(TOGGLE);
    await click(DROPDOWN_PRODUCT);

    assert.equal(count, 1, "the action was called once");
  });
});
