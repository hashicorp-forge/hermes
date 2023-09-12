import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";
import { Response } from "miragejs";

const TOGGLE_SELECTOR = "[data-test-x-dropdown-list-toggle-select]";
const LIST_ITEM_SELECTOR = "[data-test-product-select-item]";

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
    this.set("onChange", () => {});
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
    assert
      .dom(TOGGLE_SELECTOR)
      .doesNotExist("default dropdown is not rendered");

    this.set("formatIsBadge", false);

    assert
      .dom(badgeDropdownSelector)
      .doesNotExist("badge dropdown is not rendered");
    assert.dom(TOGGLE_SELECTOR).exists("default dropdown is rendered");
  });

  test("it can render the toggle with a product abbreviation", async function (this: InputsProductSelectContext, assert) {
    this.set("selected", this.server.schema.products.first().name);

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);

    assert.dom(".product-select-toggle-abbreviation").hasText("TP0");
  });

  test("it shows an empty state when nothing is selected (default toggle)", async function (this: InputsProductSelectContext, assert) {
    this.set("selected", undefined);

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);
    assert.dom(TOGGLE_SELECTOR).hasText("Select a product/area");
  });

  test("it displays the products in a dropdown list with abbreviations", async function (this: InputsProductSelectContext, assert) {
    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
      />
    `);

    await click(TOGGLE_SELECTOR);

    assert.dom(LIST_ITEM_SELECTOR).exists({ count: 4 });

    let firstListItem = this.element.querySelector(LIST_ITEM_SELECTOR);
    assert.dom(firstListItem).hasText("Test Product 0 TP0");
  });

  test("it fetches the products if they aren't already loaded", async function (this: InputsProductSelectContext, assert) {
    this.server.db.emptyData();

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @onChange={{this.onChange}}
      />
    `);

    await click(TOGGLE_SELECTOR);

    // In Mirage, we return a default product when there are no products in the database.
    // This simulates the `fetchProducts` task being run.
    assert.dom(LIST_ITEM_SELECTOR).exists({ count: 1 });
    assert.dom(LIST_ITEM_SELECTOR).hasText("Default Fetched Product NONE");
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

    await click(TOGGLE_SELECTOR);
    await click(LIST_ITEM_SELECTOR);

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
