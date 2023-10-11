import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";
import { Response } from "miragejs";

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
  });

  test("it can render in two formats", async function (this: InputsProductSelectContext, assert) {
    const badgeDropdownSelector = "[data-test-badge-dropdown-list]";

    this.set("formatIsBadge", true);

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
        @formatIsBadge={{this.formatIsBadge}}
      />
    `);

    assert.dom(badgeDropdownSelector).exists("badge dropdown is rendered");
    assert.dom(TOGGLE).doesNotExist("default dropdown is not rendered");

    this.set("formatIsBadge", false);

    assert
      .dom(badgeDropdownSelector)
      .doesNotExist("badge dropdown is not rendered");
    assert.dom(TOGGLE).exists("default dropdown is rendered");
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
    assert.dom(DROPDOWN_PRODUCT).hasText("Test Product 0 TP0");
  });

  test("it fetches the products if they aren't already loaded", async function (this: InputsProductSelectContext, assert) {
    this.server.db.emptyData();

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        data-test-content
        @onChange={{this.onChange}}
      />
    `);

    await click(TOGGLE);

    // In Mirage, we return a default product when there are no products in the database.
    // This simulates the `fetchProducts` task being run.
    assert.dom(DROPDOWN_PRODUCT).exists({ count: 1 });
    assert.dom(DROPDOWN_PRODUCT).hasText("Default Fetched Product NONE");
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

  test("it shows an error when the index fails to fetch", async function (this: InputsProductSelectContext, assert) {
    this.server.get("/products", () => {
      return new Response(500, {});
    });

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);

    assert.dom(".failed-to-load-text").hasText("Failed to load");
    assert
      .dom("[data-test-product-select-failed-to-load-button]")
      .hasText("Retry");
  });
});
