import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  TestContext,
  click,
  fillIn,
  find,
  findAll,
  render,
  triggerEvent,
  triggerKeyEvent,
  waitFor,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";
import { Placement } from "@floating-ui/dom";
import {
  DEFAULT_LOADER,
  DEFAULT_NO_MATCHES,
  EXTERNAL_LINK,
  FILTER_INPUT,
  LINK_TO,
  LOADED_CONTENT,
  LOADING_BLOCK,
  TOGGLE_ACTION,
  TOGGLE_ACTION_CHEVRON,
  TOGGLE_BUTTON,
} from "hermes/tests/helpers/selectors";

// TODO: Replace with Mirage factories

export const SHORT_ITEM_LIST = {
  Filter01: { count: 1, isSelected: false },
  Filter02: { count: 1, isSelected: false },
  Filter03: { count: 1, isSelected: false },
};

export const LONG_ITEM_LIST = {
  ...SHORT_ITEM_LIST,
  Filter04: { count: 1, isSelected: false },
  Filter05: { count: 1, isSelected: false },
  Filter06: { count: 1, isSelected: false },
  Filter07: { count: 1, isSelected: false },
  Filter08: { count: 1, isSelected: false },
};

const CONTAINER_CLASS = "x-dropdown-list";
const FIRST_ITEM_ID = "x-dropdown-list-item-0";
const SECOND_ITEM_ID = "x-dropdown-list-item-1";
const LAST_ITEM_ID = "x-dropdown-list-item-7";

interface XDropdownListComponentTestContext extends TestContext {
  items: Record<string, { count: number; isSelected: boolean }>;
  onListItemClick: (e: MouseEvent) => void;
  buttonWasClicked?: boolean;
  isLoading?: boolean;
  placement?: Placement | null;
  selected?: string;
  hasChevron?: boolean;
}

module("Integration | Component | x/dropdown-list", function (hooks) {
  setupRenderingTest(hooks);

  test("a filter input is shown for long lists", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
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
      "the correct aria-controls attribute is set",
    );

    await click("[data-test-toggle]");

    assert.dom(FILTER_INPUT).doesNotExist("The input is not shown");

    await click("[data-test-toggle]");

    this.set("items", LONG_ITEM_LIST);

    await click("[data-test-toggle]");

    assert.dom(FILTER_INPUT).exists("The input is shown");

    ariaControlsValue =
      find("[data-test-toggle]")?.getAttribute("aria-controls");

    assert.ok(
      ariaControlsValue?.startsWith(CONTAINER_CLASS),
      "the correct aria-controls attribute is set",
    );

    assert.equal(
      document.activeElement,
      find(FILTER_INPUT),
      "the input is autofocused",
    );
  });

  test("filtering works as expected", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render<XDropdownListComponentTestContext>(hbs`
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

    assert.dom("#" + FIRST_ITEM_ID).hasText("Filter01");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 8 });

    await fillIn(FILTER_INPUT, "2");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 1 });

    assert
      .dom("#" + FIRST_ITEM_ID)
      .hasText("Filter02", "the list is filtered and the IDs are updated");

    await fillIn(FILTER_INPUT, "foobar");

    assert.dom("[data-test-x-dropdown-list]").doesNotExist();
    assert.dom(DEFAULT_NO_MATCHES).hasText("No matches");
  });

  test("filtering works as expected when a secondary filter is passed in", async function (assert) {
    this.set("items", {
      foo: {
        alias: "abc",
      },
      bar: {
        alias: "def",
      },
      baz: {
        alias: "foo", // Use an alias that matches the value of an item
      },
    });

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList
        @inputIsShown={{true}}
        @secondaryFilterAttribute="alias"
        @items={{this.items}}
      >
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

    await click(TOGGLE_BUTTON);

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 3 });

    await fillIn(FILTER_INPUT, "foo");

    assert
      .dom("[data-test-x-dropdown-list-item]")
      .exists(
        { count: 2 },
        "the list is filtered by both the primary value and secondary filter",
      );

    await fillIn(FILTER_INPUT, "abc");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 1 });
  });

  test("dropdown trigger has keyboard support", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render<XDropdownListComponentTestContext>(hbs`
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
      .dom("#" + FIRST_ITEM_ID)
      .hasClass("is-aria-selected", "the aria-selected class is applied")
      .hasAttribute("aria-selected");

    assert
      .dom("[data-test-x-dropdown-list]")
      .hasAttribute("aria-activedescendant", FIRST_ITEM_ID);
  });

  test("keyboard navigation can be disabled", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}} @keyboardNavIsEnabled={{false}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.Action>Item</dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    await triggerKeyEvent("[data-test-toggle]", "keydown", "ArrowDown");

    assert
      .dom("#" + FIRST_ITEM_ID)
      .doesNotHaveAttribute("aria-selected", "no item is selected");
  });

  test("keyboard navigation stops when the filter input loses focus", async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle/>
        </:anchor>
        <:item as |dd|>
          <dd.Action>Item</dd.Action>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    await click(".x-dropdown-list-input-container");

    await triggerKeyEvent("[data-test-toggle]", "keydown", "ArrowDown");

    assert
      .dom("#" + FIRST_ITEM_ID)
      .doesNotHaveAttribute("aria-selected", "no item is selected");
  });

  test("the component's filter properties are reset on close", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render<XDropdownListComponentTestContext>(hbs`
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
    assert.dom(FILTER_INPUT).hasValue("");

    await fillIn(FILTER_INPUT, "2");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 1 });
    assert.dom(FILTER_INPUT).hasValue("2");

    // close and reopen
    await click("button");
    await click("button");

    assert.dom("[data-test-x-dropdown-list-item]").exists({ count: 8 });
    assert.dom(FILTER_INPUT).hasValue("");
  });

  test("the menu items are assigned IDs", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    await render<XDropdownListComponentTestContext>(hbs`
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
      // grab the number from the item IDs (e.g., `x-dropdown-list-item-0`)
      return item.id.split("-").pop();
    });

    assert.deepEqual(
      listItemIDs,
      ["0", "1", "2", "3", "4", "5", "6", "7"],
      "the IDs are assigned in order",
    );
  });

  test("the list has keyboard support", async function (assert) {
    this.set("items", LONG_ITEM_LIST);
    this.set("buttonWasClicked", false);
    this.set("onListItemClick", () => {
      this.set("buttonWasClicked", true);
    });

    await render<XDropdownListComponentTestContext>(hbs`
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
        item.getAttribute("aria-selected"),
      ),
      "no items are aria-selected",
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    assert.dom("#" + FIRST_ITEM_ID).hasAttribute("aria-selected");

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    assert.dom("#" + FIRST_ITEM_ID).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + SECOND_ITEM_ID).hasAttribute("aria-selected");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.dom("#" + SECOND_ITEM_ID).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + FIRST_ITEM_ID).hasAttribute("aria-selected");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.dom("#" + FIRST_ITEM_ID).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + LAST_ITEM_ID).hasAttribute("aria-selected");

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    assert.dom("#" + LAST_ITEM_ID).doesNotHaveAttribute("aria-selected");

    assert.dom("#" + FIRST_ITEM_ID).hasAttribute("aria-selected");

    assert
      .dom("[data-test-button-clicked]")
      .doesNotExist("the button has not been clicked yet");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "Enter");
    assert
      .dom("[data-test-button-clicked]")
      .exists(
        "keying Enter triggers the click action of the aria-selected item",
      );

    assert
      .dom("[data-test-x-dropdown-list]")
      .doesNotExist("the dropdown list is closed when Enter is pressed");
  });

  test("the list responds to hover events", async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
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
        item.getAttribute("aria-selected"),
      ),
      "no items are aria-selected",
    );

    await triggerEvent("#" + FIRST_ITEM_ID, "mouseenter");

    assert.dom("#" + FIRST_ITEM_ID).hasAttribute("aria-selected");

    await triggerEvent("#" + SECOND_ITEM_ID, "mouseenter");

    assert.dom("#" + FIRST_ITEM_ID).doesNotHaveAttribute("aria-selected");
    assert.dom("#" + SECOND_ITEM_ID).hasAttribute("aria-selected");
  });

  test("the list will scroll to the selected item when it is not visible", async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
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

    let container = htmlElement(".x-dropdown-list-scroll-container");
    let item = htmlElement("#x-dropdown-list-item-3");

    const containerHeight = container.offsetHeight;
    const itemHeight = item.offsetHeight;

    let itemTop = 0;
    let itemBottom = 0;
    let scrollviewTop = 0;
    let scrollviewBottom = 0;

    function measure(selector?: string) {
      if (selector) {
        item = htmlElement(selector);
      }
      itemTop = item.offsetTop;
      itemBottom = itemTop + itemHeight;
      scrollviewTop = container.scrollTop;
      scrollviewBottom = scrollviewTop + containerHeight;
    }

    measure();

    // At 160px tall, the fourth item is cropped.

    assert.true(
      itemBottom > scrollviewBottom,
      "item four is not fully visible",
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    assert.equal(
      itemBottom,
      item.offsetTop + itemHeight,
      "container isn't scrolled unless the target is out of view",
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    assert.equal(
      itemBottom,
      item.offsetTop + itemHeight,
      "container isn't scrolled unless the target is out of view",
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    assert.equal(
      itemBottom,
      item.offsetTop + itemHeight,
      "container isn't scrolled unless the target is out of view",
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    measure();

    assert.equal(
      container.scrollTop,
      itemTop + itemHeight - containerHeight,
      "item four scrolled into view",
    );

    await triggerKeyEvent(
      "[data-test-x-dropdown-list]",
      "keydown",
      "ArrowDown",
    );

    measure("#x-dropdown-list-item-4");

    assert.equal(
      container.scrollTop,
      itemTop + itemHeight - containerHeight,
      "item five scrolled into view",
    );

    measure("#" + SECOND_ITEM_ID);

    // At this point the second item is cropped:

    assert.ok(itemBottom > scrollviewTop, "item two is not fully visible");

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.equal(
      itemTop,
      item.offsetTop,
      "container isn't scrolled unless the target is out of view",
    );

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    assert.equal(
      itemTop,
      item.offsetTop,
      "container isn't scrolled unless the target is out of view",
    );

    await triggerKeyEvent("[data-test-x-dropdown-list]", "keydown", "ArrowUp");

    measure();

    assert.equal(scrollviewTop, itemTop, "item two scrolled into view");
  });

  test("the list can be rendered with LinkTos", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.LinkTo @route="authenticated.documents" @query={{hash products="Labs"}}>
            {{dd.value}}
          </dd.LinkTo>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    assert.dom(LINK_TO).exists({ count: 3 });

    const firstLink = htmlElement(LINK_TO);

    assert.equal(
      firstLink.getAttribute("href"),
      "/documents?products=Labs",
      "route and query are set",
    );
  });

  test("the list can be rendered with ExternalLinks", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
          <dd.ExternalLink href="authenticated.documents">
            {{dd.value}}
          </dd.ExternalLink>
        </:item>
      </X::DropdownList>
    `);

    await click("button");

    assert.dom(EXTERNAL_LINK).exists({ count: 3 });
    assert.dom(EXTERNAL_LINK).hasAttribute("target", "_blank");
  });
  test("the toggle action can render with a chevron", async function (assert) {
    this.set("hasChevron", false);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList>
        <:anchor as |dd|>
          <dd.ToggleAction @hasChevron={{this.hasChevron}} data-test-toggle>
            ---
          </dd.ToggleAction>
        </:anchor>
      </X::DropdownList>
    `);

    assert.dom(TOGGLE_ACTION_CHEVRON).doesNotExist();

    this.set("hasChevron", true);

    assert.dom(TOGGLE_ACTION_CHEVRON).exists();
    assert.dom(TOGGLE_ACTION_CHEVRON).hasClass("flight-icon-chevron-down");

    await click(TOGGLE_ACTION);

    assert.dom(TOGGLE_ACTION).hasClass("open");

    assert.dom(TOGGLE_ACTION_CHEVRON).hasClass("flight-icon-chevron-up");
  });

  test("the list can be rendered with a toggle button", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item as |dd|>
        {{dd.value}}
        </:item>
      </X::DropdownList>
    `);

    assert
      .dom(TOGGLE_BUTTON)
      .exists()
      .hasClass("hds-button", "the toggle button has the HDS style")
      .hasAttribute("aria-haspopup", "listbox")
      .doesNotHaveAttribute("aria-expanded");

    assert.dom(CONTAINER_CLASS).doesNotExist();
    assert.dom(".flight-icon-chevron-down").exists();
    assert.dom(".flight-icon-chevron-up").doesNotExist();

    await click(TOGGLE_BUTTON);

    assert.dom(TOGGLE_BUTTON).hasAttribute("aria-expanded");

    assert.dom("." + CONTAINER_CLASS).exists();
    assert.dom(".flight-icon-chevron-down").doesNotExist();
    assert.dom(".flight-icon-chevron-up").exists();

    const ariaControlsValue = htmlElement(TOGGLE_BUTTON).getAttribute(
      "aria-controls",
    );

    const dropdownListItemsID = htmlElement(
      ".x-dropdown-list-items",
    ).getAttribute("id");

    assert.equal(
      ariaControlsValue,
      dropdownListItemsID,
      "the aria-controls value matches the dropdown list ID",
    );

    let dataAnchorID = htmlElement(TOGGLE_BUTTON).getAttribute(
      "data-anchor-id",
    );

    let contentAnchoredTo = htmlElement("." + CONTAINER_CLASS).getAttribute(
      "data-anchored-to",
    );

    assert.equal(
      dataAnchorID,
      contentAnchoredTo,
      "the anchor is properly registered",
    );
  });

  test("the list can be rendered with a toggle action", async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleAction data-test-toggle>
            <div data-test-custom-toggle>
              I can be anything
            </div>
          </dd.ToggleAction>
        </:anchor>
        <:item as |dd|>
        {{dd.value}}
        </:item>
      </X::DropdownList>
    `);

    assert
      .dom(TOGGLE_ACTION)
      .exists()
      .hasAttribute("aria-haspopup", "listbox")
      .doesNotHaveAttribute("aria-expanded");

    assert.dom(CONTAINER_CLASS).doesNotExist();

    await click(TOGGLE_ACTION);

    assert.dom(TOGGLE_ACTION).hasAttribute("aria-expanded");

    assert.dom("." + CONTAINER_CLASS).exists();

    const ariaControlsValue = htmlElement(TOGGLE_ACTION).getAttribute(
      "aria-controls",
    );

    const dropdownListItemsID = htmlElement(
      ".x-dropdown-list-items",
    ).getAttribute("id");

    assert.equal(
      ariaControlsValue,
      dropdownListItemsID,
      "the aria-controls value matches the dropdown list ID",
    );

    let dataAnchorID = htmlElement(TOGGLE_ACTION).getAttribute(
      "data-anchor-id",
    );

    let contentAnchoredTo = htmlElement("." + CONTAINER_CLASS).getAttribute(
      "data-anchored-to",
    );

    assert.equal(
      dataAnchorID,
      contentAnchoredTo,
      "the anchor is properly registered",
    );
  });

  test("items can conditionally be rendered outside of the list element", async function (assert) {
    this.set("items", {
      "View all items": {
        count: 1,
        isSelected: false,
        itemShouldRenderOut: true,
      },
      ...SHORT_ITEM_LIST,
    });

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:header>
          <div class="target-div">
            {{! Rendered-out items will be go here}}
          </div>
        </:header>
        <:item as |dd|>
          {{#if dd.attrs.itemShouldRenderOut}}
            {{#in-element (html-element ".target-div") insertBefore=null}}
              <div class="rendered-out-div">
                {{dd.value}}
              </div>
            {{/in-element}}
          {{else}}
            <div class="rendered-in-div">{{dd.value}}</div>
          {{/if}}
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    assert
      .dom(".rendered-in-div")
      .exists({ count: 3 }, "the in-list items are rendered");

    assert
      .dom(".rendered-out-div")
      .exists({ count: 1 }, "the out-of-list items are rendered");

    assert
      .dom(".target-div")
      .hasText(
        "View all items",
        "the rendered-out item was place into the target div",
      );

    assert
      .dom("li")
      .exists({ count: 3 }, "there are a correct number of list items");
  });

  test('"null" placement removes the "hermes-popover" class', async function (assert) {
    this.set("items", SHORT_ITEM_LIST);
    this.set("placement", undefined);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}} @placement={{this.placement}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item>
          <div>Item</div>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    assert
      .dom("." + CONTAINER_CLASS)
      .hasClass("hermes-popover", "the popover class is applied");

    this.set("placement", null);

    assert
      .dom("." + CONTAINER_CLASS)
      .doesNotHaveClass("hermes-popover", "the popover class is removed");
  });

  test('it yields a "loading" block', async function (assert) {
    this.set("items", SHORT_ITEM_LIST);
    this.set("isLoading", true);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}} @isLoading={{this.isLoading}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:loading>
          Loading...
        </:loading>
        <:item>
          <div>Item</div>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    assert
      .dom(LOADED_CONTENT)
      .doesNotExist("the loaded content is not shown");

    assert.dom(LOADING_BLOCK).exists("the loading block is shown");

    this.set("isLoading", false);

    assert
      .dom(LOADED_CONTENT)
      .exists("the loaded content is shown after loading is complete");

    assert
      .dom(LOADING_BLOCK)
      .doesNotExist("the loading block is not shown");
  });

  test('it shows a loading spinner if no "loading" block is provided', async function (assert) {
    this.set("items", SHORT_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}} @isLoading={{true}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item>
          <div>Item</div>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    assert.dom(LOADING_BLOCK).doesNotExist("no custom block rendered");
    assert.dom(LOADED_CONTENT).doesNotExist("content not shown");

    assert.dom(DEFAULT_LOADER).exists("the default loader is shown");
  });

  test("it can force the input to be hidden", async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}} @inputIsShown={{false}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:item>
          <div>Item</div>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);

    assert.dom(FILTER_INPUT).doesNotExist();
  });

  test('it yields a "no matches" block', async function (assert) {
    this.set("items", LONG_ITEM_LIST);

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleButton @text="Toggle" data-test-toggle />
        </:anchor>
        <:no-matches>
          <div data-test-nothing>
            Nothing...
          </div>
        </:no-matches>
        <:item>
          <div>Item</div>
        </:item>
      </X::DropdownList>
    `);

    await click(TOGGLE_BUTTON);
    await fillIn(FILTER_INPUT, "foobar");

    assert
      .dom(DEFAULT_NO_MATCHES)
      .doesNotExist("the default empty state is not shown");

    assert.dom("[data-test-nothing]").exists("the custom empty state is shown");
  });

  test("it renders a ToggleSelect to the anchor API", async function (assert) {
    this.set("items", {});

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList @items={{this.items}}>
        <:anchor as |dd|>
          <dd.ToggleSelect data-test-toggle>
            ---
          </dd.ToggleSelect>
        </:anchor>
      </X::DropdownList>
    `);

    const toggleSelect = "[data-test-toggle]";
    const content = `.${CONTAINER_CLASS}`;

    assert.dom(toggleSelect).hasClass("x-dropdown-list-toggle-select");
    assert.dom(`${toggleSelect} [data-test-caret]`).exists();

    assert.dom(content).doesNotExist();

    await click(toggleSelect);

    assert.dom(content).exists();

    await click(toggleSelect);

    assert.dom(content).doesNotExist();
  });

  test("it renders the selected value to the anchor API", async function (assert) {
    this.set("items", {});
    this.set("selected", "Foo");

    await render<XDropdownListComponentTestContext>(hbs`
      <X::DropdownList
        @items={{this.items}}
        @selected={{this.selected}}
      >
        <:anchor as |dd|>
          <div data-test-div>
            {{dd.selected}}
          </div>
        </:anchor>
      </X::DropdownList>
    `);

    assert.dom("[data-test-div]").hasText("Foo");
  });
});
