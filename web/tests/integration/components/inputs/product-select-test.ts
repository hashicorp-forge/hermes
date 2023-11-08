import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, find, render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";
import { Response } from "miragejs";
import { assert as emberAssert } from "@ember/debug";
import htmlElement from "hermes/utils/html-element";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const TOGGLE = "[data-test-x-dropdown-list-toggle-select]";
const POPOVER = "[data-test-x-dropdown-list-content]";
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

    await setupProductIndex(this);
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
});
