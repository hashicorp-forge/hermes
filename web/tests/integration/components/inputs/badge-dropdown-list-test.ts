import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, findAll, render } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { Placement } from "@floating-ui/dom";
import getProductId from "hermes/utils/get-product-id";

interface BadgeDropdownListTestContext extends MirageTestContext {
  items: any;
  selected?: any;
  listIsOrdered?: boolean;
  isSaving?: boolean;
  onItemClick: ((e: Event) => void) | ((selected: string) => void);
  placement?: Placement;
  icon: string;
  updateIcon: () => void;
}

const TRIGGER_SELECTOR = "[data-test-badge-dropdown-trigger]";
const ITEM_SELECTOR = "[data-test-x-dropdown-list-item]";
const DEFAULT_ACTION_SELECTOR =
  "[data-test-badge-dropdown-list-default-action]";

module(
  "Integration | Component | inputs/badge-dropdown-list",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function (this: BadgeDropdownListTestContext) {
      this.items = { Waypoint: {}, Labs: {}, Boundary: {} };
      this.selected = Object.keys(this.items)[1];

      const updateIcon = () => {
        let icon = "folder";
        if (this.selected && getProductId(this.selected)) {
          icon = getProductId(this.selected) as string;
        }
        this.set("icon", icon);
      };

      updateIcon();

      this.onItemClick = (selected: string) => {
        this.set("selected", selected);
        updateIcon();
      };
    });

    test("it functions as expected (default checkable item)", async function (this: BadgeDropdownListTestContext, assert) {
      await render<BadgeDropdownListTestContext>(hbs`
        {{! @glint-ignore: not typed yet }}
        <Inputs::BadgeDropdownList
          @items={{this.items}}
          @selected={{this.selected}}
          @onItemClick={{this.onItemClick}}
          @icon={{this.icon}}
        />
      `);

      const iconSelector = "[data-test-badge-dropdown-list-icon] .flight-icon";
      const chevronSelector = "[data-test-badge-dropdown-list-chevron-icon]";

      assert.dom(iconSelector).hasAttribute("data-test-icon", "folder");
      assert.dom(TRIGGER_SELECTOR).hasText("Labs");
      assert
        .dom(chevronSelector)
        .hasAttribute("data-test-chevron-position", "down");

      await click(TRIGGER_SELECTOR);

      let listItemsText = findAll(DEFAULT_ACTION_SELECTOR).map((el) =>
        el.textContent?.trim()
      );

      assert.deepEqual(
        listItemsText,
        ["Waypoint", "Labs", "Boundary"],
        "correct list items are rendered"
      );
      assert
        .dom(
          `${ITEM_SELECTOR}:nth-child(2) [data-test-x-dropdown-list-checkable-item-check]`
        )
        .hasAttribute("data-test-is-checked");

      await click(DEFAULT_ACTION_SELECTOR);

      assert.dom(TRIGGER_SELECTOR).hasText("Waypoint");
      assert.dom(iconSelector).hasAttribute("data-test-icon", "waypoint");
      assert
        .dom(chevronSelector)
        .hasAttribute("data-test-chevron-position", "down");
    });

    test("it functions as expected (custom interactive item)", async function (this: BadgeDropdownListTestContext, assert) {
      await render<BadgeDropdownListTestContext>(hbs`
        {{! @glint-ignore: not typed yet }}
        <Inputs::BadgeDropdownList
          @items={{this.items}}
          @selected={{this.selected}}
          @onItemClick={{this.onItemClick}}
          @icon={{this.icon}}
        >
          <:item as |dd|>
            <dd.Action>
              {{dd.value}}
              {{#if dd.isSelected}}
                <span>(selected)</span>
              {{/if}}
            </dd.Action>
          </:item>
        </Inputs::BadgeDropdownList>
      `);

      await click(TRIGGER_SELECTOR);

      assert.dom(ITEM_SELECTOR).hasText("Waypoint");

      assert
        .dom(DEFAULT_ACTION_SELECTOR)
        .doesNotExist("default action is not rendered");

      assert.dom(`${ITEM_SELECTOR}:nth-child(2)`).hasText("Labs (selected)");
    });
  }
);
