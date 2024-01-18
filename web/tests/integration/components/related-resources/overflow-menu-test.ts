import { TestContext, click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { OverflowItem } from "hermes/components/overflow-menu";
import htmlElement from "hermes/utils/html-element";
import { module, test } from "qunit";

const POPOVER = "[data-test-overflow-menu]";
const TOGGLE = "[data-test-x-dropdown-list-toggle-action]";
const ACTION = `${POPOVER} [data-test-action]`;
const ICON = `${POPOVER} .flight-icon`;
const LABEL = `${POPOVER} [data-test-label]`;

interface OverflowMenuTestContext extends TestContext {
  items: Record<string, OverflowItem>;
  isShown?: boolean;
}

module("Integration | Component | related-resources/add", function (hooks) {
  setupRenderingTest(hooks);

  test("it creates a menu from a list of items", async function (this: OverflowMenuTestContext, assert) {
    let actionOneCount = 0;
    let actionTwoCount = 0;

    this.set("items", {
      item1: {
        label: "Item 1",
        icon: "square",
        action: () => actionOneCount++,
      },
      item2: {
        label: "Item 2",
        icon: "circle",
        action: () => actionTwoCount++,
      },
    });

    await render<OverflowMenuTestContext>(hbs`
      <OverflowMenu
        data-test-overflow-popover
        @items={{this.items}}
      />
    `);

    assert.dom(POPOVER).doesNotExist();

    await click(TOGGLE);

    assert.dom(POPOVER).exists();

    const expectedLabels = ["Item 1", "Item 2"];
    const expectedIcons = ["square", "circle"];

    const actualLabels = findAll(LABEL).map((el) => el.textContent?.trim());
    const actualIcons = findAll(ICON).map(
      (el) => el.getAttribute("data-test-icon")?.trim(),
    );

    assert.deepEqual(actualLabels, expectedLabels);
    assert.deepEqual(actualIcons, expectedIcons);

    // Click the first action
    await click(ACTION);

    assert.equal(actionOneCount, 1);
    assert.dom(POPOVER).doesNotExist();

    // Reopen the menu and click the second action

    await click(TOGGLE);
    await click(`${POPOVER} li:nth-child(2) button`);

    assert.equal(actionTwoCount, 1);
  });

  test("it can be force-shown", async function (this: OverflowMenuTestContext, assert) {
    this.set("isShown", false);
    this.set("items", {
      item1: {
        label: "Item 1",
        icon: "square",
        action: () => {},
      },
    });
    await render<OverflowMenuTestContext>(hbs`
      <OverflowMenu
        @items={{this.items}}
        @isShown={{this.isShown}}
      />
    `);

    assert.dom(TOGGLE).hasStyle({ visibility: "hidden" });

    this.set("isShown", true);

    assert.dom(TOGGLE).hasStyle({ visibility: "visible" });
  });
});
