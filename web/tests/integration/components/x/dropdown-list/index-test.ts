import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
  find,
  findAll,
  getSettledState,
  render,
  settled,
  triggerEvent,
  triggerKeyEvent,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";
import { assert as emberAssert } from "@ember/debug";

// TODO: Replace with Mirage factories
export const SHORT_ITEM_LIST = {
  Filter01: { count: 1, selected: false },
  Filter02: { count: 1, selected: false },
  Filter03: { count: 1, selected: false },
};

export const LONG_ITEM_LIST = {
  ...SHORT_ITEM_LIST,
  Filter04: { count: 1, selected: false },
  Filter05: { count: 1, selected: false },
  Filter06: { count: 1, selected: false },
  Filter07: { count: 1, selected: false },
  Filter08: { count: 1, selected: false },
};

const FIRST_ITEM_SELECTOR = "x-dropdown-list-item-0";
const SECOND_ITEM_SELECTOR = "x-dropdown-list-item-1";
const LAST_ITEM_SELECTOR = "x-dropdown-list-item-7";

module("Integration | Component | x/dropdown-list", function (hooks) {
  setupRenderingTest(hooks);

  test("a filter input is shown for long lists", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    let ariaControlsValue =
      find("[data-test-toggle]")?.getAttribute("aria-controls");

    assert.ok(
      ariaControlsValue?.startsWith("x-dropdown-list-items"),
      "the correct aria-controls attribute is set"
    );

    await click("[data-test-toggle]");

    assert
      .dom("[data-test-x-dropdown-list-input]")
      .doesNotExist("The input is not shown");

    this.set("items", LONG_ITEM_LIST);

    assert
      .dom("[data-test-x-dropdown-list-input]")
      .exists("The input is shown");

    ariaControlsValue =
      find("[data-test-toggle]")?.getAttribute("aria-controls");

    assert.ok(
      ariaControlsValue?.startsWith("x-dropdown-list-container"),
      "the correct aria-controls attribute is set"
    );

    assert.equal(
      document.activeElement,
      this.element.querySelector("[data-test-x-dropdown-list-input]"),
      "the input is autofocused"
    );
  });

  test("filtering works as expected", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" />
        </:anchor>
        <:item as |dd|>
          <dd.Action>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    assert.dom("#" + FIRST_ITEM_SELECTOR).hasText("Filter01");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 8 });

    await fillIn("[data-test-x-dropdown-list-input]", "2");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 1 });

    assert
      .dom("#" + FIRST_ITEM_SELECTOR)
      .hasText("Filter02", "the list is filtered and the IDs are updated");

    await fillIn("[data-test-x-dropdown-list-input]", "foobar");

    assert.dom("[data-test-x-dropdown-list]").doesNotExist();
    assert.dom("[data-test-dropdown-list-empty-state]").hasText("No matches");
  });

  test("dropdown trigger has keyboard support", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    assert
      .dom("[data-test-x-dropdown-list-content]")
      .doesNotExist("The popover is not shown");

    await triggerKeyEvent("[data-test-toggle]", "keydown", "ArrowDown");

    assert
      .dom("[data-test-x-dropdown-list-content]")
      .exists("The popover is shown");

    await waitFor(".is-aria-selected");

    assert
      .dom("#" + FIRST_ITEM_SELECTOR)
      .hasClass("is-aria-selected", "the aria-selected class is applied")
      .hasAttribute("aria-selected");

    assert
      .dom("[data-test-x-dropdown-list]")
      .hasAttribute("aria-activedescendant", FIRST_ITEM_SELECTOR);
  });

  test("the component's filter properties are reset on close", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 8 });
    assert.dom("[data-test-x-dropdown-list-input]").hasValue("");

    await fillIn("[data-test-x-dropdown-list-input]", "2");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 1 });
    assert.dom("[data-test-x-dropdown-list-input]").hasValue("2");

    // close and reopen
    await click("button");
    await click("button");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 8 });
    assert.dom("[data-test-x-dropdown-list-input]").hasValue("");
  });

  test("the menu items are assigned IDs", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action data-test-item-button>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    const listItemIDs = findAll("[data-test-item-button]").map((item) => {
      // grab the number from the item's ID (`x-dropdown-list-item-0`)
      return item.id.split("-").pop();
    });

    assert.deepEqual(
      listItemIDs,
      ["0", "1", "2", "3", "4", "5", "6", "7"],
      "the IDs are assigned in order"
    );
  });

  test("the list has keyboard support", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    this.set("buttonWasClicked", false);
    this.set("onListItemClick", () => {
      this.set("buttonWasClicked", true);
    });

    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action data-test-item-button {{on "click" this.onListItemClick}}>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>

      {{#if this.buttonWasClicked}}
        <div data-test-button-clicked>Button was clicked</div>
      {{/if}}
    `);

    await click("button");

    assert.false(
      findAll("[data-test-item-button]").some((item) =>
        item.getAttribute("aria-selected")
      ),
      "no items are aria-selected"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.dom("#" + FIRST_ITEM_SELECTOR).hasAttribute("aria-selected");

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.dom("#" + FIRST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + SECOND_ITEM_SELECTOR).hasAttribute("aria-selected");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert
      .dom("#" + SECOND_ITEM_SELECTOR)
      .doesNotHaveAttribute("aria-selected");
    assert.dom("#" + FIRST_ITEM_SELECTOR).hasAttribute("aria-selected");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.dom("#" + FIRST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + LAST_ITEM_SELECTOR).hasAttribute("aria-selected");

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.dom("#" + LAST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");

    assert.dom("#" + FIRST_ITEM_SELECTOR).hasAttribute("aria-selected");

    assert
      .dom("[data-test-button-clicked]")
      .doesNotExist("the button has not been clicked yet");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "Enter");
    assert
      .dom("[data-test-button-clicked]")
      .exists(
        "keying Enter triggers the click action of the aria-selected item"
      );

    assert
      .dom("[data-test-x-dropdown-list]")
      .doesNotExist("the dropdown list is closed when Enter is pressed");
  });

  test("the list responds to hover events", async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action data-test-item-button>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    assert.false(
      findAll("[data-test-item-button]").some((item) =>
        item.getAttribute("aria-selected")
      ),
      "no items are aria-selected"
    );

    await triggerEvent("#" + FIRST_ITEM_SELECTOR, "mouseenter");

    assert.dom("#" + FIRST_ITEM_SELECTOR).hasAttribute("aria-selected");

    await triggerEvent("#" + SECOND_ITEM_SELECTOR, "mouseenter");

    assert.dom("#" + FIRST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + SECOND_ITEM_SELECTOR).hasAttribute("aria-selected");
  });

  test("the list will scroll to the selected item when it is not visible", async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render(hbs`
      <X::DropdownList @items={{this.items}} style="max-height:160px">
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action data-test-item-button>
            {{dd.value}}
          </dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    // At 160px tall, the fourth item is cropped.
    let container = htmlElement(".x-dropdown-list-scroll-container");
    let item = htmlElement("#x-dropdown-list-item-3");

    const containerHeight = container.offsetHeight;
    const itemHeight = item.offsetHeight;

    let itemTop = 0;
    let itemBottom = 0;
    let scrollviewTop = 0;
    let scrollviewBottom = 0;

    function updateMeasurements(selector?: string) {
      if (selector) {
        item = htmlElement(selector);
      }
      itemTop = item.offsetTop;
      itemBottom = itemTop + itemHeight;
      scrollviewTop = container.scrollTop;
      scrollviewBottom = scrollviewTop + containerHeight;
    }

    updateMeasurements();

    assert.true(
      itemBottom > scrollviewBottom,
      "item four is not fully visible"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.equal(
      itemBottom,
      item.offsetTop + itemHeight,
      "container isn't scrolled unless the target is out of view"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.equal(
      itemBottom,
      item.offsetTop + itemHeight,
      "container isn't scrolled unless the target is out of view"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.equal(
      itemBottom,
      item.offsetTop + itemHeight,
      "container isn't scrolled unless the target is out of view"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    updateMeasurements();

    assert.equal(
      container.scrollTop,
      itemTop + itemHeight - containerHeight,
      "item four scrolled into view"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    updateMeasurements('#x-dropdown-list-item-4');

    assert.equal(
      container.scrollTop,
      itemTop + itemHeight - containerHeight,
      "item five scrolled into view"
    );

    updateMeasurements('#' + SECOND_ITEM_SELECTOR);

    assert.ok(itemBottom > scrollviewTop, "item two is not fully visible");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.equal(
      itemTop,
      item.offsetTop,
      "container isn't scrolled unless the target is out of view"
    );

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.equal(
      itemTop,
      item.offsetTop,
      "container isn't scrolled unless the target is out of view"
    );

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    updateMeasurements();

    assert.equal(scrollviewTop, itemTop, "item two scrolled into view");
  });
});
