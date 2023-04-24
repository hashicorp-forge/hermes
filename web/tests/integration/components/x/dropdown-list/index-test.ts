import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
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

module("Integration | Component | x/dropdown-list", function (hooks) {
  setupRenderingTest(hooks);

  test("a filter input is shown for long lists", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

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

    assert
      .dom("[data-test-x-dropdown-list-input]")
      .doesNotExist("The input is not shown");

    this.set("items", LONG_ITEM_LIST);

    assert
      .dom("[data-test-x-dropdown-list-input]")
      .exists("The input is shown");
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
    this.set("facets", LONG_ITEM_LIST);
    await render(hbs`
      <X::DropdownList @items={{this.facets}}>
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
});
