import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import {
  click,
  findAll,
  render,
  teardownContext,
  waitUntil,
} from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";

interface BadgeDropdownListTestContext extends MirageTestContext {
  items: any;
  selected?: any;
  listIsOrdered?: boolean;
  isSaving?: boolean;
  onItemClick: ((e: Event) => void) | ((selected: string) => void);
  placement?: Placement;
}

module(
  "Integration | Component | inputs/badge-dropdown-list",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it functions as expected (default checkable item)", async function (this: BadgeDropdownListTestContext, assert) {
      this.items = { Waypoint: {}, Labs: {}, Boundary: {} };
      this.selected = Object.keys(this.items)[1];
      this.onItemClick = (selected: string) => {
        this.set("selected", selected);
      };

      await render<BadgeDropdownListTestContext>(hbs`
        {{! @glint-ignore: not typed yet }}
        <Inputs::BadgeDropdownList
          @items={{this.items}}
          @selected={{this.selected}}
          @onItemClick={{this.onItemClick}}
        />
      `);

      const iconSelector = "[data-test-badge-dropdown-list-icon] .flight-icon";
      const triggerSelector = "[data-test-badge-dropdown-trigger]";
      const chevronSelector = "[data-test-badge-dropdown-list-chevron-icon]";
      const itemSelector = "[data-test-x-dropdown-list-item]";
      const itemActionSelector =
        "[data-test-badge-dropdown-list-default-action]";

      assert.dom(iconSelector).hasAttribute("data-test-icon", "folder");
      assert.dom(triggerSelector).hasText("Labs");
      assert
        .dom(chevronSelector)
        .hasAttribute("data-test-chevron-position", "down");

      await click(triggerSelector);

      let listItemsText = findAll(itemActionSelector).map((el) =>
        el.textContent?.trim()
      );

      assert.deepEqual(
        listItemsText,
        ["Waypoint", "Labs", "Boundary"],
        "correct list items are rendered"
      );

      assert
        .dom(
          `${itemSelector}:nth-child(2) [data-test-x-dropdown-list-checkable-item-check]`
        )
        .hasAttribute("data-test-is-checked");

      await click(itemActionSelector);

      assert.dom(triggerSelector).hasText("Waypoint");
      assert.dom(iconSelector).hasAttribute("data-test-icon", "waypoint");
      assert
        .dom(chevronSelector)
        .hasAttribute("data-test-chevron-position", "down");
    });
  }
);
