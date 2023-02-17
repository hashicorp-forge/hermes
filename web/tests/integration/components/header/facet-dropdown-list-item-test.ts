import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module(
  "Integration | Component | header/facet-dropdown-list-item",
  function (hooks) {
    setupRenderingTest(hooks);

    test("the check mark is visible if the filter is selected", async function (assert) {
      this.set("setFocusedItemIndex", () => {});
      this.set("isSelected", false);

      await render(hbs`
        <Header::FacetDropdownListItem
          @role="option"
          @value="Filter01"
          @selected={{this.isSelected}}
          @count={{1}}
          @setFocusedItemIndex={{this.setFocusedItemIndex}}
          @focusedItemIndex={{0}}
        />
      `);

      assert.dom(".flight-icon").hasStyle({ visibility: "hidden" });

      this.set("isSelected", true);

      assert.dom(".flight-icon").hasStyle({ visibility: "visible" });
    });

    test("it gets aria-focused on mouseenter", async function (assert) {
      this.set("isSelected", false);
      this.set("focusedItemIndex", -1);
      this.set("setFocusedItemIndex", (focusDirection: number) => {
        this.set("focusedItemIndex", focusDirection);
      });

      await render(hbs`
        <Header::FacetDropdownListItem
          @value="Filter01"
          @count={{1}}
          @focusedItemIndex={{this.focusedItemIndex}}
          @selected={{this.isSelected}}
          @setFocusedItemIndex={{this.setFocusedItemIndex}}
        />
      `);

      const listItemSelector = ".facet-dropdown-menu-item-link";

      assert.dom(listItemSelector).doesNotHaveClass("is-focused");
      assert.dom(listItemSelector).doesNotHaveAttribute("aria-selected");

      await triggerEvent(listItemSelector, "mouseenter");
      assert.dom(listItemSelector).hasClass("is-focused");
      assert.dom(listItemSelector).hasAttribute("aria-selected");
    });
  }
);
