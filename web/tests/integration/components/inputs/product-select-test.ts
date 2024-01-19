import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";
import htmlElement from "hermes/utils/html-element";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const TOGGLE = "[data-test-x-dropdown-list-toggle-select]";
const POPOVER = "[data-test-x-dropdown-list-content]";
const DROPDOWN_PRODUCT =
  "[data-test-x-dropdown-list-content] [data-test-product-select-item]";
const PRODUCT_NAME = "[data-test-product-value]";
const FOLDER_ICON = "[data-test-icon='folder']";
const ABBREVIATION = "[data-test-product-select-item-abbreviation]";

interface InputsProductSelectContext extends MirageTestContext {
  selected?: any;
  onChange: (value: string) => void;
  placement?: Placement;
  isSaving?: boolean;
  color?: "quarternary";
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

    await setupProductIndex(this);
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
    assert
      .dom(`${DROPDOWN_PRODUCT} ${PRODUCT_NAME}`)
      .containsText("Test Product 0");
    assert.dom(`${DROPDOWN_PRODUCT} ${ABBREVIATION}`).hasText("TP0");
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

  test("the standard select can match the anchor width", async function (this: InputsProductSelectContext, assert) {
    await render<InputsProductSelectContext>(hbs`
      <div style="width:800px;">
        <Inputs::ProductSelect
          @selected={{this.selected}}
          @onChange={{this.onChange}}
          @matchAnchorWidth={{true}}
          style="width:100px; max-width: 100px;"
        />
      </div>
    `);

    /**
     * We include `width` and `max-width` on the component
     * to demonstrate that the popover is sized by `matchAnchorWidth`
     */

    await click(TOGGLE);

    const buttonWidth = htmlElement(TOGGLE)?.offsetWidth;
    const popoverWidth = htmlElement(POPOVER)?.offsetWidth;

    assert.equal(buttonWidth, 800);
    assert.equal(popoverWidth, 800);
  });

  test("the standard select can be positioned at an offset", async function (this: InputsProductSelectContext, assert) {
    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
        @offset={{hash mainAxis=100 crossAxis=100}}
      />
    `);

    const toggle = htmlElement(TOGGLE);

    const toggleLeft = toggle.offsetLeft;
    const toggleBottom = toggle.offsetTop + toggle.offsetHeight;

    await click(TOGGLE);

    const popover = htmlElement(POPOVER);

    const popoverLeft = popover.offsetLeft;
    const popoverTop = popover.offsetTop;

    assert.equal(toggleLeft + 100, popoverLeft);
    assert.equal(toggleBottom + 100, popoverTop);
  });

  test("a folder icon is shown when no product is selected", async function (this: InputsProductSelectContext, assert) {
    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @onChange={{this.onChange}}
      />
    `);

    assert.dom(TOGGLE).hasText("Select a product/area");
    assert.dom(FOLDER_ICON).exists();
  });

  test("the abbreviation of the selected product can be hidden", async function (this: InputsProductSelectContext, assert) {
    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
        @selectedAbbreviationIsHidden={{true}}
      />
    `);

    assert.dom(`${TOGGLE} ${PRODUCT_NAME}`).hasText("Vault");
    assert.dom(ABBREVIATION).doesNotExist();
  });

  test("it can render in the quarternary button style", async function (this: InputsProductSelectContext, assert) {
    this.set("color", undefined);

    await render<InputsProductSelectContext>(hbs`
      <Inputs::ProductSelect
        @selected={{this.selected}}
        @onChange={{this.onChange}}
        @color={{this.color}}
      />
    `);

    assert
      .dom(TOGGLE)
      .hasClass("shadow-elevation-low")
      .hasClass("border-color-border-input")
      .doesNotHaveClass("quarternary-button");

    this.set("color", "quarternary");

    assert
      .dom(TOGGLE)
      .doesNotHaveClass("shadow-elevation-low")
      .doesNotHaveClass("border-color-border-input")
      .hasClass("quarternary-button");
  });
});
