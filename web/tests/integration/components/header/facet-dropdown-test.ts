import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, render, triggerKeyEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

export const SHORT_FACET_LIST = {
  RFC: {
    count: 10,
    selected: false,
  },
  PRD: {
    count: 5,
    selected: true,
  },
};

export const LONG_FACET_LIST = {
  Filter01: { count: 1, selected: false },
  Filter02: { count: 1, selected: false },
  Filter03: { count: 1, selected: false },
  Filter04: { count: 1, selected: false },
  Filter05: { count: 1, selected: false },
  Filter06: { count: 1, selected: false },
  Filter07: { count: 1, selected: false },
  Filter08: { count: 1, selected: false },
  Filter09: { count: 1, selected: false },
  Filter10: { count: 1, selected: false },
  Filter11: { count: 1, selected: false },
  Filter12: { count: 1, selected: false },
  Filter13: { count: 1, selected: false },
};

module("Integration | Component | header/facet-dropdown", function (hooks) {
  setupRenderingTest(hooks);

  test("it toggles when the trigger is clicked", async function (assert) {
    this.set("facets", SHORT_FACET_LIST);
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);
    assert.dom("[data-test-facet-dropdown-popover]").doesNotExist();
    await click("[data-test-facet-dropdown-trigger]");
    assert.dom("[data-test-facet-dropdown-popover]").exists("The dropdown is shown");
  });

  test("it renders the facets correctly", async function (assert) {
    this.set("facets", SHORT_FACET_LIST);
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);
    await click("[data-test-facet-dropdown-trigger]");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(1)")
      .hasText("RFC 10", "Correct facet name and count");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(1) .flight-icon")
      .hasStyle({ visibility: "hidden" }, "Unselected facets have no icon");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(2)")
      .hasText("PRD 5", "Correct facet name and count");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(2) .flight-icon")
      .hasStyle({ visibility: "visible" }, "Selected facets have an icon");
  });

  test("an input is shown when there are more than 12 facets", async function (assert) {
    this.set("facets", LONG_FACET_LIST);
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::FacetDropdown
        @label="Status"
        @facets={{this.facets}}
      />
    `);
    await click("[data-test-facet-dropdown-trigger]");
    assert.dom("[data-test-facet-dropdown-input]").exists("The input is shown");
  });

  test("filtering works as expected", async function (assert) {
    this.set("facets", LONG_FACET_LIST);
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::FacetDropdown
        @label="Status"
        @facets={{this.facets}}
      />
    `);

    await click("[data-test-facet-dropdown-trigger]");

    let firstItemSelector = "#facet-dropdown-menu-item-0";

    assert.dom(firstItemSelector).hasText("Filter01 1");
    assert.dom("[data-test-facet-dropdown-menu-item]").exists({ count: 13 });
    await fillIn("[data-test-facet-dropdown-input]", "3");

    assert
      .dom("[data-test-facet-dropdown-menu-item]")
      .exists({ count: 2 }, "The facets are filtered");
    assert
      .dom(firstItemSelector)
      .hasText(
        "Filter03 1",
        "The facet IDs are updated when the list is filtered to match the new order"
      );

    await fillIn("[data-test-facet-dropdown-input]", "foobar");

    assert.dom("[data-test-facet-dropdown-menu]").doesNotExist();
    assert
      .dom("[data-test-facet-dropdown-menu-empty-state]")
      .exists('the "No matches" message is shown');
  });

  test("popover trigger has keyboard support", async function (assert) {
    this.set("facets", LONG_FACET_LIST);
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);

    assert.dom("[data-test-facet-dropdown-popover]").doesNotExist();

    await triggerKeyEvent(
      "[data-test-facet-dropdown-trigger]",
      "keydown",
      "ArrowDown"
    );

    assert.dom("[data-test-facet-dropdown-popover]").exists("The dropdown is shown");
    let firstItemSelector = "#facet-dropdown-menu-item-0";

    assert.dom(firstItemSelector).hasAttribute("aria-selected");
    assert
      .dom("[data-test-facet-dropdown-menu]")
      .hasAttribute("aria-activedescendant", "facet-dropdown-menu-item-0");
  });
});
