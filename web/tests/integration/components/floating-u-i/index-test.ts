import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";

module("Integration | Component | floating-u-i/index", function (hooks) {
  setupRenderingTest(hooks);

  test("it functions as expected", async function (assert) {
    this.set("renderOut", undefined);

    await render(hbs`
      <FloatingUI>
        <:anchor as |f|>
          <Action
            class="open-button"
            {{on "click" f.showContent}}
            {{did-insert f.registerAnchor}}
          >
            Open
          </Action>
          <Action class="toggle-button" {{on "click" f.toggleContent}}>
            Toggle
          </Action>
        </:anchor>
        <:content as |f|>
          <div class="content" id={{f.contentID}}>
            Content
          </div>
          <Action class="close-button" {{on "click" f.hideContent}}>
            Close
          </Action>
        </:content>
      </FloatingUI>
    `);

    assert.dom(".content").doesNotExist();

    await click(".open-button");

    assert.dom(".content").exists();
    const contentID = htmlElement(".content").id;

    assert.ok(contentID.startsWith("ember"), "a contentID was assigned");

    await click(".open-button");
    assert
      .dom(".content")
      .exists("clicking the open button again does nothing");

    await click(".toggle-button");
    assert.dom(".content").doesNotExist();

    await click(".toggle-button");
    assert.dom(".content").exists();

    await click(".close-button");

    assert
      .dom(".content")
      .doesNotExist("the API is also available to the content block");
  });

  test("the close action can be disabled", async function (assert) {
    await render(hbs`
      <FloatingUI @disableClose={{true}}>
        <:anchor as |f|>
          <Action
            class="open-button"
            {{on "click" f.showContent}}
            {{did-insert f.registerAnchor}}
          >
            Open
          </Action>
        </:anchor>
        <:content as |f|>
          <Action {{on "click" f.hideContent}} class="close-button">
            Close
          </Action>
        </:content>
      </FloatingUI>
    `);

    await click(".open-button");

    assert.dom(".close-button").exists();

    await click(".close-button");

    assert.dom(".close-button").exists('the "close" action was disabled');
  });
});
