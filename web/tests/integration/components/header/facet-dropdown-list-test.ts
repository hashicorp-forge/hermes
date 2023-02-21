import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  fillIn,
  find,
  findAll,
  render,
  triggerKeyEvent,
} from "@ember/test-helpers";
import { assert as emberAssert } from "@ember/debug";
import { hbs } from "ember-cli-htmlbars";
import { LONG_FACET_LIST, SHORT_FACET_LIST } from "./facet-dropdown-test";
import { FocusDirection } from "hermes/components/header/facet-dropdown";

module(
  "Integration | Component | header/facet-dropdown-list",
  function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      this.set("popoverElement", null);
      this.set("registerPopover", (element: HTMLDivElement) => {
        this.set("popoverElement", element);
      });
      this.set("focusedItemIndex", -1);
      this.set("scrollContainer", null);
      this.set("registerScrollContainer", (element: HTMLDivElement) => {
        this.set("scrollContainer", element);
      });
      this.set("registerMenuItems", (menuItems: NodeListOf<Element>) => {
        menuItems.forEach((item, index) => {
          item.setAttribute("id", `facet-dropdown-menu-item-${index}`);
        });
      });
      this.set("resetMenuItemIndex", () => {
        this.set("focusedItemIndex", -1);
      });
      this.set("onInput", () => {});
      this.set("setFocusedItemIndex", (direction: FocusDirection) => {
        const currentIndex = this.get("focusedItemIndex");
        emberAssert(
          "currentIndex must be a number",
          typeof currentIndex === "number"
        );

        const numberOfItems = findAll(
          "[data-test-facet-dropdown-menu-item]"
        ).length;

        if (direction === FocusDirection.Next) {
          if (currentIndex === numberOfItems - 1) {
            this.set("focusedItemIndex", 0);
            return;
          } else {
            this.set("focusedItemIndex", currentIndex + 1);
            return;
          }
        }
        if (direction === FocusDirection.Previous) {
          if (currentIndex === 0) {
            this.set("focusedItemIndex", numberOfItems - 1);
            return;
          } else {
            this.set("focusedItemIndex", currentIndex - 1);
            return;
          }
        }
      });
    });

    test("keyboard navigation works as expected (long list)", async function (assert) {
      this.set("shownFacets", LONG_FACET_LIST);

      await render(hbs`
      <Header::FacetDropdownList
        @shownFacets={{this.shownFacets}}
        @label="Status"
        @inputIsShown={{true}}
        @onInput={{this.onInput}}
        @resetMenuItemIndex={{this.resetMenuItemIndex}}
        @popoverElement={{this.popoverElement}}
        @registerPopover={{this.registerPopover}}
        @focusedItemIndex={{this.focusedItemIndex}}
        @setFocusedItemIndex={{this.setFocusedItemIndex}}
        @listItemRole="option"
        @registerScrollContainer={{this.registerScrollContainer}}
        @query=""
        @registerMenuItems={{this.registerMenuItems}}
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
    });

    test("keyboard navigation works as expected (short list)", async function (assert) {
      this.set("shownFacets", SHORT_FACET_LIST);

      await render(hbs`
        <Header::FacetDropdownList
          @shownFacets={{this.shownFacets}}
          @label="Status"
          @inputIsShown={{false}}
          @onInput={{this.onInput}}
          @resetMenuItemIndex={{this.resetMenuItemIndex}}
          @popoverElement={{this.popoverElement}}
          @registerPopover={{this.registerPopover}}
          @focusedItemIndex={{this.focusedItemIndex}}
          @setFocusedItemIndex={{this.setFocusedItemIndex}}
          @listItemRole="option"
          @registerScrollContainer={{this.registerScrollContainer}}
          @query=""
          @registerMenuItems={{this.registerMenuItems}}
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

    test("it applies the correct classNames to the popover", async function (assert) {
      this.set("shownFacets", SHORT_FACET_LIST);
      this.set("label", "Status");
      this.set("inputIsShown", false);

      await render(hbs`
        <Header::FacetDropdownList
          @shownFacets={{this.shownFacets}}
          @label={{this.label}}
          @inputIsShown={{this.inputIsShown}}
          @onInput={{this.onInput}}
          @resetMenuItemIndex={{this.resetMenuItemIndex}}
          @popoverElement={{this.popoverElement}}
          @registerPopover={{this.registerPopover}}
          @focusedItemIndex={{this.focusedItemIndex}}
          @setFocusedItemIndex={{this.setFocusedItemIndex}}
          @listItemRole="option"
          @registerScrollContainer={{this.registerScrollContainer}}
          @query=""
          @registerMenuItems={{this.registerMenuItems}}
        />
      `);

      let popoverSelector = ".facet-dropdown-popover";
      let popover = find(popoverSelector);

      emberAssert("popover must exist", popover);

      assert.dom(popoverSelector).doesNotHaveClass("large");
      assert
        .dom(popoverSelector)
        .hasClass("medium", 'the status facet has a "medium" class');

      this.set("label", "Type");

      assert.dom(popoverSelector).doesNotHaveClass("large");
      assert
        .dom(popoverSelector)
        .doesNotHaveClass(
          "medium",
          'only the status facet has a "medium" class'
        );

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
