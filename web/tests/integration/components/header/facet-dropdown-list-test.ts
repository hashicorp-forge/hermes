import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import {
  click,
  fillIn,
  find,
  render,
  triggerKeyEvent,
  waitFor,
} from "@ember/test-helpers";
import { assert as emberAssert } from "@ember/debug";
import { hbs } from "ember-cli-htmlbars";

const SHORT_FACET_LIST = {
  RFC: {
    count: 10,
    selected: false,
  },
  PRD: {
    count: 5,
    selected: true,
  },
};

const LONG_FACET_LIST = {
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

module(
  "Integration | Component | header/facet-dropdown-list",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("filtering works as expected", async function (this: MirageTestContext, assert) {
      this.set("facets", LONG_FACET_LIST);

      await render(hbs`
      <Header::FacetDropdownList
        @label="Status"
        @facets={{this.facets}}
        @inputIsShown={{true}}
      />
    `);

      assert.dom("[data-test-facet-dropdown-menu-item]").exists({ count: 13 });

      let firstItemSelector = "#facet-dropdown-menu-item-0";

      assert.dom(firstItemSelector).hasText("Filter01 1");

      await fillIn(".facet-dropdown-input", "3");

      assert
        .dom("[data-test-facet-dropdown-menu-item]")
        .exists({ count: 2 }, "The facets are filtered");

      assert
        .dom(firstItemSelector)
        .hasText(
          "Filter03 1",
          "The facet IDs are updated when the list is filtered to match the new order"
        );

      await fillIn(".facet-dropdown-input", "foobar");

      assert.dom("[data-test-facet-dropdown-menu]").doesNotExist();
      assert.dom("[data-test-facet-dropdown-menu-empty-state]").exists();

      // TODO: test that the ids change with every update
    });

    test("keyboard navigation works as expected (long list)", async function (this: MirageTestContext, assert) {
      this.set("facets", LONG_FACET_LIST);

      await render(hbs`
      <Header::FacetDropdownList
        @label="Status"
        @facets={{this.facets}}
        @inputIsShown={{true}}
      />
    `);

      let inputSelector = ".facet-dropdown-input";
      let input = find(inputSelector);

      emberAssert("input must exist", input);

      assert.equal(document.activeElement, input, "The input is autofocused");
      assert.dom(".facet-dropdown-popover").hasAttribute("role", "combobox");
      assert
        .dom(inputSelector)
        .doesNotHaveAttribute(
          "aria-activedescendant",
          "No items are aria-focused yet"
        );

      await triggerKeyEvent(input, "keydown", "ArrowDown");
      assert
        .dom(inputSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-0",
          "When no items are aria-focused, ArrowDown moves aria-focus to the first item"
        );
      assert
        .dom("[data-test-facet-dropdown-menu]")
        .doesNotHaveAttribute(
          "aria-activedescendant",
          "In the filterable menu, aria-activedescendant is not set on the menu"
        );

      await triggerKeyEvent(input, "keydown", "ArrowDown");
      assert
        .dom(inputSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-1",
          "ArrowDown moves aria-focus to the next item"
        );

      await triggerKeyEvent(input, "keydown", "ArrowUp");
      assert
        .dom(inputSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-0",
          "ArrowUp moves aria-focus to the previous item"
        );

      await triggerKeyEvent(input, "keydown", "ArrowUp");
      assert
        .dom(inputSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-12",
          "Keying up on the first item aria-focuses the last item"
        );

      await triggerKeyEvent(input, "keydown", "ArrowDown");
      assert
        .dom(inputSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-0",
          "Keying down on the last item aria-focuses the first item"
        );

      await fillIn(inputSelector, "3");
      assert
        .dom(inputSelector)
        .doesNotHaveAttribute(
          "aria-activedescendant",
          "Aria-focus resets when the user types"
        );

      assert.dom("[data-test-facet-dropdown-menu] li").exists({ count: 2 });

      /**
       * At this point our current index is -1 (no items aria-focused) and
       * our menu-item options are now 0 and 1. We know ArrowDown will move focus
       * to `facet-dropdown-menu-item-0`, so let's assert the ArrowUp behavior:
       **/
      await triggerKeyEvent(input, "keydown", "ArrowUp");
      assert
        .dom(inputSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-1",
          "When no items are aria-focused, ArrowUp moves aria-focus to the last item"
        );
    });

    test("keyboard navigation works as expected (short list)", async function (this: MirageTestContext, assert) {
      this.set("facets", SHORT_FACET_LIST);

      await render(hbs`
        <Header::FacetDropdownList
          @label="Status"
          @facets={{this.facets}}
          @inputIsShown={{false}}
        />
      `);

      let menuSelector = "[data-test-facet-dropdown-menu]";
      let menu = find(menuSelector);

      emberAssert("menu must exist", menu);

      assert
        .dom(menuSelector)
        .doesNotHaveAttribute(
          "aria-activedescendant",
          "No items are aria-focused yet"
        );

      await triggerKeyEvent(menu, "keydown", "ArrowDown");
      assert
        .dom(menuSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-0",
          "When no items are aria-focused, ArrowDown moves aria-focus to the first item"
        );

      await triggerKeyEvent(menu, "keydown", "ArrowDown");
      assert
        .dom(menuSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-1",
          "ArrowDown moves aria-focus to the next item"
        );

      await triggerKeyEvent(menu, "keydown", "ArrowUp");
      assert
        .dom(menuSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-0",
          "ArrowUp moves aria-focus to the previous item"
        );

      await triggerKeyEvent(menu, "keydown", "ArrowUp");
      assert
        .dom(menuSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-1",
          "Keying up on the first item aria-focuses the last item"
        );
    });

    test("keyboard navigation works as expected (short list, ArrowUp)", async function (this: MirageTestContext, assert) {
      this.set("facets", SHORT_FACET_LIST);

      await render(hbs`
        <Header::FacetDropdownList
          @label="Status"
          @facets={{this.facets}}
          @inputIsShown={{false}}
        />
      `);

      let menuSelector = "[data-test-facet-dropdown-menu]";
      let menu = find(menuSelector);

      emberAssert("menu must exist", menu);

      assert
        .dom(menuSelector)
        .doesNotHaveAttribute(
          "aria-activedescendant",
          "No items are aria-focused yet"
        );

      /**
       * We tested the ArrowDown behavior in the previous test,
       * Now let's test the ArrowUp behavior:
       */
      await triggerKeyEvent(menu, "keydown", "ArrowUp");
      assert
        .dom(menuSelector)
        .hasAttribute(
          "aria-activedescendant",
          "facet-dropdown-menu-item-1",
          "When no items are aria-focused, ArrowUp moves aria-focus to the last item"
        );
    });

    test("it applies the correct classNames to the popover", async function (this: MirageTestContext, assert) {
      this.set("facets", SHORT_FACET_LIST);
      this.set("label", "Status");
      this.set("inputIsShown", false);

      await render(hbs`
        <Header::FacetDropdownList
          @label={{this.label}}
          @facets={{this.facets}}
          @inputIsShown={{this.inputIsShown}}
        />
      `);

      let popoverSelector = ".facet-dropdown-popover";
      let popover = find(popoverSelector);

      emberAssert("popover must exist", popover);

      assert
        .dom(popoverSelector)
        .hasClass("medium", 'the status facet has a "medium" class');

      assert.dom(popoverSelector).doesNotHaveClass("large");

      this.set("label", "Type");

      assert
        .dom(popoverSelector)
        .doesNotHaveClass(
          "medium",
          'only the status facet has a "medium" class'
        );

      assert.dom(popoverSelector).doesNotHaveClass("large");

      this.set("inputIsShown", true);

      assert
        .dom(popoverSelector)
        .hasClass("large", 'facets with inputs have a "large" class');

      this.set("label", "Status");

      assert.dom(popoverSelector).hasClass("large");

      assert
        .dom(popoverSelector)
        .doesNotHaveClass(
          "medium",
          "because the status facet has an input, the medium class is not applied"
        );
    });
  }
);
