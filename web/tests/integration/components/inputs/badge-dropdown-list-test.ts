import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import {
  click,
  fillIn,
  findAll,
  render,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { HermesUser } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import { Placement } from "@floating-ui/dom";
import { timeout } from "ember-concurrency";

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

    todo(
      "it functions as expected (default checkable item)",
      async function (this: BadgeDropdownListTestContext, assert) {
        this.items = { Waypoint: {}, Labs: {}, Boundary: {} };
        this.selected = Object.keys(this.items)[1];
        this.isSaving = false;

        this.onItemClick = (selected: string) => {
          this.set("isSaving", true);
          this.set("selected", selected);

          setTimeout(() => {
            this.set("isSaving", false);
          }, 100);
        };

        await render<BadgeDropdownListTestContext>(hbs`
        {{! @glint-ignore: not typed yet }}
        <Inputs::BadgeDropdownList
          @items={{this.items}}
          @selected={{this.selected}}
          @onItemClick={{this.onItemClick}}
          @isSaving={{this.isSaving}}
        />
      `);

        const iconSelector = "[data-test-badge-dropdown-list-icon]";
        const triggerSelector = "[data-test-badge-dropdown-trigger]";
        const chevronSelector = "[data-test-badge-dropdown-list-chevron-icon]";
        const savingIconSelector =
          "[data-test-badge-dropdown-list-saving-icon]";
        const itemSelector = "[data-test-badge-dropdown-list-default-action]";

        assert.dom(iconSelector).hasAttribute("data-test-icon", "folder");
        assert.dom(triggerSelector).hasText("Labs");
        assert
          .dom(chevronSelector)
          .hasAttribute("data-test-chevron-position", "down");

        assert.dom(savingIconSelector).doesNotExist();

        await click(triggerSelector);

        let listItemsText = findAll(itemSelector).map((el) => el.textContent);
        assert.deepEqual(listItemsText, ["foo", "bar", "waypoint"]);

        assert
          .dom(
            `${itemSelector}:nth-child(2) [data-test-x-dropdown-list-checkable-item-check]`
          )
          .hasAttribute("data-test-is-checked", "true");

        // let clickPromise = click(itemSelector);

        // await waitFor(savingIconSelector);

        // Note: This is where the TODO test fails (as we expect)
        assert.dom(savingIconSelector).exists();

        /**
         * FIXME: Something is causing the test to hang here
         * Likely to do with the `next` runloop.
         */

        // await clickPromise;

        // await waitUntil(() => !this.isSaving);

        assert.dom(savingIconSelector).doesNotExist();

        assert
          .dom(chevronSelector)
          .hasAttribute("data-test-chevron-position", "up");
        assert.dom(triggerSelector).hasText("Waypoint");
        assert.dom(iconSelector).hasAttribute("data-test-icon", "waypoint");
      }
    );
  }
);
