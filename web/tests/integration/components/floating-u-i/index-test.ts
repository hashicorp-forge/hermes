import { module, test } from "qunit";
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

  test("the popover can match the anchor width", async function (assert) {
    await render(hbs`
      <FloatingUI @matchAnchorWidth={{true}}>
        <:anchor as |f|>
          <Action
            id="open-button-1"
            style="width:500px;"
            {{on "click" f.showContent}}
            {{did-insert f.registerAnchor}}
          >
            Open
          </Action>
        </:anchor>
        <:content>
          <div id="content-1">
            Content
          </div>
        </:content>
      </FloatingUI>

      <FloatingUI @matchAnchorWidth={{hash enabled=true additionalWidth=100}}>
        <:anchor as |f|>
          <Action
            id="open-button-2"
            style="width:500px;"
            {{on "click" f.showContent}}
            {{did-insert f.registerAnchor}}
          >
            Open
          </Action>
        </:anchor>
        <:content>
          <div id="content-2">
            Content
          </div>
        </:content>
      </FloatingUI>

      <FloatingUI @matchAnchorWidth={{hash enabled=true additionalWidth=-100}}>
        <:anchor as |f|>
          <Action
            id="open-button-3"
            style="width:500px;"
            {{on "click" f.showContent}}
            {{did-insert f.registerAnchor}}
          >
            Open
          </Action>
        </:anchor>
        <:content>
          <div id="content-3">
            Content
          </div>
        </:content>
      </FloatingUI>
    `);

    await click("#open-button-1");

    let contentWidth = htmlElement("#content-1").offsetWidth;

    assert.equal(
      contentWidth,
      500,
      "the content width matches the anchor width"
    );

    await click("#open-button-2");

    contentWidth = htmlElement("#content-2").offsetWidth;

    assert.equal(
      contentWidth,
      600,
      "the content width matches the anchor width plus the additional width"
    );

    await click("#open-button-3");

    contentWidth = htmlElement("#content-3").offsetWidth;

    assert.equal(
      contentWidth,
      400,
      "the content width matches the anchor width minus the additional width"
    );
  });
});
