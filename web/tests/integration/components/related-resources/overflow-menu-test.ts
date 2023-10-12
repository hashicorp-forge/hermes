import { TestContext, click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { OverflowItem } from "hermes/components/related-resources/overflow-menu";
import { module, test } from "qunit";

const POPOVER = "[data-test-related-resources-list-item-overflow-menu]";
const TOGGLE = "[data-test-x-dropdown-list-toggle-action]";
const ACTION = `${POPOVER} [data-test-action]`;
const ICON = `${POPOVER} [data-test-flight-icon]`;
const LABEL = `${POPOVER} [data-test-label]`;

interface RelatedResourcesOverflowMenuTestContext extends TestContext {
  items: Record<string, OverflowItem>;
}

module("Integration | Component | related-resources/add", function (hooks) {
  setupRenderingTest(hooks);

  test("it creates a menu from a list of items", async function (this: RelatedResourcesOverflowMenuTestContext, assert) {
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

    await render<RelatedResourcesOverflowMenuTestContext>(hbs`
      <RelatedResources::OverflowMenu
        data-test-overflow-popover
        @items={{this.items}}
      />
    `);

    assert.dom(POPOVER).doesNotExist();

    await click(TOGGLE);

    assert.dom(POPOVER).exists();

    const expectedLabels = ["Item 1", "Item 2"];
    const expectedIcons = ["square", "circle"];

    assert.equal(
      [...this.element.querySelectorAll(LABEL)].map(
        (el) => el.textContent?.trim(),
      ),
      expectedLabels,
    );

    assert.equal(
      [...this.element.querySelectorAll(ICON)].map(
        (el) => el.getAttribute("data-test-flight-icon")?.trim(),
      ),
      expectedIcons,
    );

    // Click the first action
    await click(ACTION);

    assert.equal(actionOneCount, 1);
    assert.dom(POPOVER).doesNotExist();

    // Reopen the menu and click the second action

    await click(TOGGLE);
    await click(`${POPOVER} li:nth-child(2) button`);

    assert.equal(actionTwoCount, 1);
  });
});
