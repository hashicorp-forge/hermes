import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module(
  "Integration | Component | header/facet-dropdown-list-item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("the check mark is visible if the filter is selected", async function (this: MirageTestContext, assert) {
      this.set("setFocusTo", () => {});
      this.set("isSelected", false);

      await render(hbs`
        <Header::FacetDropdownListItem
          @role="option"
          @value="Filter01"
          @selected={{this.isSelected}}
          @count={{1}}
          @setFocusTo={{this.setFocusTo}}
          @menuItemFocusIndex={{0}}
        />
      `);

      assert.dom(".flight-icon").hasStyle({ visibility: "hidden" });

      this.set("isSelected", true);

      assert.dom(".flight-icon").hasStyle({ visibility: "visible" });
    });

    test("it gets aria-focused on mouseenter", async function (this: MirageTestContext, assert) {
      this.set("isSelected", false);
      this.set("menuItemFocusIndex", -1);
      this.set("setFocusTo", (focusDirection: number) => {
        this.set("menuItemFocusIndex", focusDirection);
      });

      await render(hbs`
        <Header::FacetDropdownListItem
          @value="Filter01"
          @count={{1}}
          @menuItemFocusIndex={{this.menuItemFocusIndex}}
          @selected={{this.isSelected}}
          @setFocusTo={{this.setFocusTo}}
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
