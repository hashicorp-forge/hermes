import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { CheckmarkPosition } from "hermes/components/x/dropdown-list/checkable-item";

const ITEM = "[data-test-checkable-item]";
const CHECK = "[data-test-x-dropdown-list-checkable-item-check]";
const COUNT = "[data-test-x-dropdown-list-checkable-item-count]";

interface XDropdownListCheckableItemTestContext extends TestContext {
  isSelected: boolean;
  count?: number;
  checkmarkPosition?: `${CheckmarkPosition}`;
}

module("Integration | Component | x/dropdown-list", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (this: XDropdownListCheckableItemTestContext, assert) {
    this.set("isSelected", false);
    this.set("count", undefined);

    await render<XDropdownListCheckableItemTestContext>(hbs`
      <X::DropdownList::CheckableItem
        @isSelected={{this.isSelected}}
        @value="foo"
        @count={{this.count}}
      />
    `);

    assert
      .dom(ITEM)
      .doesNotHaveClass("has-count")
      .hasStyle({ "grid-template-areas": '"check label"' });

    assert.dom(CHECK).hasClass("invisible");
    assert.dom("[data-test-x-dropdown-list-item-value]").hasText("foo");
    assert.dom(COUNT).doesNotExist();

    this.set("isSelected", true);

    assert.dom(CHECK).hasClass("visible");

    this.set("count", 0);

    assert
      .dom(ITEM)
      .hasClass("has-count")
      .hasStyle({ "grid-template-areas": '"check label count"' });

    assert.dom(COUNT).hasText("0");
  });

  test("it can render the checkmark in a leading or trailing position", async function (this: XDropdownListCheckableItemTestContext, assert) {
    this.set("checkmarkPosition", undefined);

    await render<XDropdownListCheckableItemTestContext>(hbs`
      <X::DropdownList::CheckableItem
        @checkmarkPosition={{this.checkmarkPosition}}
        @isSelected={{true}}
        @count={{0}}
        @value="foo"
      />
    `);

    assert
      .dom(ITEM)
      .hasClass(
        "checkmark-position--leading",
        "default checkmark position is leading",
      )
      .hasStyle({ "grid-template-areas": '"check label count"' });

    this.set("checkmarkPosition", "trailing");

    assert
      .dom(ITEM)
      .hasClass(
        "checkmark-position--trailing",
        "can render checkmark in trailing position",
      );

    assert.dom(ITEM).hasStyle({ "grid-template-areas": '"label count check"' });
  });

  test("it takes a `shouldCapitalize` argument", async function (this: XDropdownListCheckableItemTestContext, assert) {
    await render<XDropdownListCheckableItemTestContext>(hbs`
      <X::DropdownList::CheckableItem
        @value="foo"
        @shouldCapitalize={{true}}
      />
    `);

    assert.dom(ITEM).hasText("Foo", "the value is capitalized");
  });
});
