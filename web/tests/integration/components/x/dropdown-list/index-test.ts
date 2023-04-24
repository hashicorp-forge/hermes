import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
  find,
  findAll,
  render,
  triggerKeyEvent,
  waitFor,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

// TODO: Replace with Mirage factories
export const SHORT_ITEM_LIST = {
  Filter01: { count: 1, selected: false },
  Filter02: { count: 1, selected: false },
  Filter03: { count: 1, selected: false },
};

export const LONG_ITEM_LIST = {
  Filter01: { count: 1, selected: false },
  Filter02: { count: 1, selected: false },
  Filter03: { count: 1, selected: false },
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
      findAll("[data-test-item-button]").some(
        (item) => item.getAttribute("aria-selected") === "true"
      ),
      "no items are aria-selected"
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert
      .dom("#" + FIRST_ITEM_SELECTOR)
      .hasAttribute("aria-selected", "true", "the first item is aria-selected");

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.dom("#" + FIRST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");

    assert
      .dom("#" + SECOND_ITEM_SELECTOR)
      .hasAttribute(
        "aria-selected",
        "true",
        "the second item is aria-selected"
      );

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert
      .dom("#" + SECOND_ITEM_SELECTOR)
      .doesNotHaveAttribute("aria-selected");

    assert
      .dom("#" + FIRST_ITEM_SELECTOR)
      .hasAttribute("aria-selected", "true", "the first item is aria-selected");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.dom("#" + FIRST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");

    assert
      .dom("#" + LAST_ITEM_SELECTOR)
      .hasAttribute(
        "aria-selected",
        "true",
        "the last item is aria-selected when pressing up from the first"
      );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown"
    );

    assert.dom("#" + LAST_ITEM_SELECTOR).doesNotHaveAttribute("aria-selected");

    assert
      .dom("#" + FIRST_ITEM_SELECTOR)
      .hasAttribute(
        "aria-selected",
        "true",
        "the first item is aria-selected when pressing down from the last"
      );
  });
});
