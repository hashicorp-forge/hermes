import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

const CHECK_SELECTOR = "[data-test-x-dropdown-list-checkable-item-check]";
const COUNT_SELECTOR = "[data-test-x-dropdown-list-checkable-item-count]";

module("Integration | Component | x/dropdown-list", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    this.set("selected", false);
    this.set("count", null);

    await render(hbs`
      <X::DropdownList::CheckableItem
        @selected={{this.selected}}
        @value="foo"
        @count={{this.count}}
      />
    `);

    assert.dom(CHECK_SELECTOR).hasClass("invisible");
    assert.dom(".x-dropdown-list-item-value").hasText("foo");
    assert.dom(COUNT_SELECTOR).doesNotExist();

    this.set("selected", true);

    assert.dom(CHECK_SELECTOR).hasClass("visible");

    this.set("count", 1);
    assert.dom(COUNT_SELECTOR).hasText("1");
  });
});
