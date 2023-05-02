import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { SortByValue } from "hermes/components/header/toolbar";
import ActiveFiltersService from "hermes/services/active-filters";
import RouterService from "@ember/routing/router-service";
import sinon from "sinon";
import { assert as emberAssert } from "@ember/debug";

module(
  "Integration | Component | header/facet-dropdown-list-item",
  function (hooks) {
    setupRenderingTest(hooks);
    hooks.beforeEach(function () {
      // Stub the currentRouteName so the component can generate a route/query
      sinon
        .stub(
          this.owner.lookup("service:router") as RouterService,
          "currentRouteName"
        )
        .value("authenticated.all");

      this.set("noop", () => {});
    });

    test("the check mark is visible if the filter is selected", async function (assert) {
      this.set("isSelected", false);

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Header::FacetDropdownListItem
          @label="Status"
          @role="option"
          @value="Filter01"
          @selected={{this.isSelected}}
          @count={{1}}
          @setFocusedItemIndex={{this.noop}}
          @focusedItemIndex={{0}}
        />
      `);

      assert
        .dom("[data-test-facet-dropdown-list-item-check]")
        .hasStyle({ visibility: "hidden" }, "check is initially hidden");

      this.set("isSelected", true);

      assert
        .dom("[data-test-facet-dropdown-list-item-check]")
        .hasStyle(
          { visibility: "visible" },
          'check is visible when "selected" is true'
        );
    });

    test("filters display a badge count and sort controls show an icon", async function (assert) {
      this.set("currentSortByValue", undefined);

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Header::FacetDropdownListItem
          @label="Status"
          @value="Oldest"
          @count={{15}}
          @setFocusedItemIndex={{this.noop}}
          @focusedItemIndex={{0}}
          @currentSortByValue={{this.currentSortByValue}}
        />
      `);

      assert
        .dom("[data-test-facet-dropdown-menu-item-count]")
        .hasText("15", "badge count is displayed");
      assert
        .dom("[data-test-facet-dropdown-list-item-sort-icon]")
        .doesNotExist(
          "sort icon isn't shown unless `currentSortByValue` is defined"
        );

      this.set("currentSortByValue", SortByValue.DateAsc);

      assert
        .dom("[data-test-facet-dropdown-list-item-sort-icon]")
        .exists("sort icon is shown");
      assert
        .dom("[data-test-facet-dropdown-menu-item-count]")
        .doesNotExist(
          "badge count isn't shown when `currentSortByValue` is defined"
        );
    });

    test("it has the correct queryParams", async function (assert) {
      this.set("currentSortByValue", null);
      this.set("value", "Approved");

      const activeFiltersService = this.owner.lookup(
        "service:active-filters"
      ) as ActiveFiltersService;

      activeFiltersService.index = {
        docType: [],
        owners: [],
        product: [],
        status: [],
      };

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Header::FacetDropdownListItem
          @label="Status"
          @value={{this.value}}
          @count={{15}}
          @role="option"
          @selected={{false}}
          @setFocusedItemIndex={{this.noop}}
          @hideDropdown={{this.noop}}
          @focusedItemIndex={{-1}}
          @currentSortByValue={{this.currentSortByValue}}
        />
      `);

      assert
        .dom("[data-test-facet-dropdown-menu-item-link]")
        .hasAttribute(
          "href",
          "/all?status=%5B%22Approved%22%5D",
          "filter queryParams are correct"
        );

      this.set("currentSortByValue", SortByValue.DateAsc);
      this.set("value", "Oldest");

      assert
        .dom("[data-test-facet-dropdown-menu-item-link]")
        .hasAttribute(
          "href",
          `/all?sortBy=${SortByValue.DateAsc}`,
          "sort queryParams are correct"
        );
    });

    test("it gets aria-focused on mouseenter", async function (assert) {
      this.set("isSelected", false);
      this.set("focusedItemIndex", -1);
      this.set("setFocusedItemIndex", (focusDirection: number) => {
        this.set("focusedItemIndex", focusDirection);
      });

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Header::FacetDropdownListItem
          @label="Status"
          @value="Filter01"
          @count={{1}}
          @focusedItemIndex={{this.focusedItemIndex}}
          @selected={{this.isSelected}}
          @setFocusedItemIndex={{this.setFocusedItemIndex}}
        />
      `);

      const listItemSelector = "[data-test-facet-dropdown-menu-item-link]";

      assert.dom(listItemSelector).doesNotHaveClass("is-aria-selected");
      assert.dom(listItemSelector).doesNotHaveAttribute("aria-selected");

      await triggerEvent(listItemSelector, "mouseenter");
      assert.dom(listItemSelector).hasClass("is-aria-selected");
      assert.dom(listItemSelector).hasAttribute("aria-selected");
    });
  }
);
