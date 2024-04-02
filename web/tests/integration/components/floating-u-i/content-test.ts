import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, find, render, waitUntil } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";
import { OffsetOptions } from "@floating-ui/dom";

const DEFAULT_CONTENT_OFFSET = 5;
const CONTENT_SELECTOR = ".hermes-floating-ui-content";

interface Context extends TestContext {
  renderOut?: boolean;
  offset?: OffsetOptions;
  class: string;
  isShown: boolean;
  spacerIsShown: boolean;
  hide: () => void;
}

module("Integration | Component | floating-u-i/content", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.set("hide", () => {});
  });

  test("it can be rendered inline or outside", async function (this: Context, assert) {
    this.set("renderOut", false);

    await render<Context>(hbs`
      <div class="anchor">
        Attach here
      </div>

      <div class="container">
        <FloatingUI::Content
          @id="1"
          @anchor={{html-element '.anchor'}}
          @renderOut={{this.renderOut}}
          @hide={{this.hide}}
        >
          Content
        </FloatingUI::Content>
      </div>
    `);

    assert
      .dom(`.container ${CONTENT_SELECTOR}`)
      .exists("content is rendered inline by default");

    this.set("renderOut", true);

    assert
      .dom(`.container ${CONTENT_SELECTOR}`)
      .doesNotExist("content is rendered outside its container");

    assert
      .dom(`.ember-application ${CONTENT_SELECTOR}`)
      .exists("content is rendered in the root element");
  });

  test("it will render out to a dialog if one is present", async function (assert) {
    await render<Context>(hbs`

      <dialog>
        Dialog
      </dialog>

      <div class="anchor">
        Attach here
      </div>

      <div class="container">
        <FloatingUI::Content
          @id="1"
          @anchor={{html-element '.anchor'}}
          @renderOut={{true}}
          @hide={{this.hide}}
        >
          Content
        </FloatingUI::Content>
      </div>
    `);

    assert
      .dom(`.container ${CONTENT_SELECTOR}`)
      .doesNotExist("content is rendered outside its container");

    assert
      .dom(`dialog ${CONTENT_SELECTOR}`)
      .exists("content is rendered in the dialog");
  });

  test("it is positioned by floating-ui", async function (this: Context, assert) {
    let contentWidth = 0;
    let anchorWidth = 0;
    let contentLeft = 0;
    let contentRight = 0;
    let anchorLeft = 0;
    let anchorRight = 0;

    let setVariables = (anchor: HTMLElement, content: HTMLElement) => {
      contentWidth = content.offsetWidth;
      contentLeft = content.offsetLeft;
      contentRight = content.offsetLeft + contentWidth;

      anchorWidth = anchor.offsetWidth;
      anchorLeft = anchor.offsetLeft;
      anchorRight = anchorLeft + anchorWidth;
    };

    // Center the anchor so the content can be flexibly positioned

    await render<Context>(hbs`
      <div class="grid place-items-center w-full h-full">
        <div>
          <div class="anchor" style="width: 100px">
            Attach
          </div>
          <FloatingUI::Content
            style="width: 100px"
            @id="1"
            @anchor={{html-element '.anchor'}}
            @placement="left"
            @hide={{this.hide}}
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    let anchor = htmlElement(".anchor");
    let content = htmlElement(CONTENT_SELECTOR);

    setVariables(anchor, content);

    assert.ok(content.getAttribute("data-floating-ui-placement") === "left");
    assert.ok(
      contentRight === anchorLeft - DEFAULT_CONTENT_OFFSET,
      "content is offset to the left of the anchor",
    );
    assert.ok(
      contentWidth === 100,
      "the correct width was splatted to the content element",
    );

    // Clear and set the placement to 'right'

    this.clearRender();

    await render<Context>(hbs`
      <div class="grid place-items-center w-full h-full">
        <div>
          <div class="anchor" style="width: 100px">
            Attach
          </div>
          <FloatingUI::Content
            style="width: 100px"
            @id="1"
            @anchor={{html-element '.anchor'}}
            @placement="right"
            @hide={{this.hide}}
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    anchor = htmlElement(".anchor");
    content = htmlElement(CONTENT_SELECTOR);

    setVariables(anchor, content);

    assert.ok(content.getAttribute("data-floating-ui-placement") === "right");
    assert.ok(
      contentLeft === anchorRight + DEFAULT_CONTENT_OFFSET,
      "content is offset to the right of anchor",
    );
  });

  test("it can use a custom offset", async function (this: Context, assert) {
    await render<Context>(hbs`
      <div class="grid place-items-center w-full h-full">
        <div>
          <div class="anchor" style="width: 100px">
            Attach
          </div>
          <FloatingUI::Content
            style="width: 100px"
            @id="1"
            @anchor={{html-element '.anchor'}}
            @placement="left"
            @hide={{this.hide}}
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    let anchor = htmlElement(".anchor");
    let content = htmlElement(CONTENT_SELECTOR);
    let contentWidth = content.offsetWidth;
    let contentRight = content.offsetLeft + contentWidth;
    let anchorLeft = anchor.offsetLeft;

    assert.equal(
      contentRight,
      anchorLeft - DEFAULT_CONTENT_OFFSET,
      "content is offset to the left of the anchor",
    );

    // Clear and set the offset to 10
    this.clearRender();
    this.set("offset", 10);

    await render<Context>(hbs`
      <div class="grid place-items-center w-full h-full">
        <div>
          <div class="anchor" style="width: 100px">
            Attach
          </div>
          <FloatingUI::Content
            style="width: 100px"
            @id="1"
            @anchor={{html-element '.anchor'}}
            @placement="left"
            @offset={{this.offset}}
            @hide={{this.hide}}
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    anchor = htmlElement(".anchor");
    content = htmlElement(CONTENT_SELECTOR);
    contentWidth = content.offsetWidth;
    contentRight = content.offsetLeft + contentWidth;
    anchorLeft = anchor.offsetLeft;

    assert.equal(
      contentRight,
      anchorLeft - 10,
      "content is offset by the passed-in value",
    );
  });

  test("it can ignore dynamic positioning", async function (assert) {
    await render<Context>(hbs`
      <div class="anchor">
        Attach
      </div>
      <FloatingUI::Content
        @id="1"
        @anchor={{html-element '.anchor'}}
        @placement={{null}}
        @hide={{this.hide}}
      >
        Content
      </FloatingUI::Content>
    `);

    assert
      .dom(CONTENT_SELECTOR)
      .doesNotHaveAttribute("data-floating-ui-placement");

    const content = htmlElement(CONTENT_SELECTOR);

    assert.true(
      content.classList.contains("non-floating-content"),
      "content has the `non-floating-content` class",
    );

    assert.true(
      getComputedStyle(content).position === "static",
      "content is static",
    );

    const inlineStyle = content.getAttribute("style");

    assert.strictEqual(
      inlineStyle,
      null,
      "content not positioned by floatingUI",
    );
  });

  test("it runs the passed-in hide action when the anchor is dragged", async function (assert) {
    this.set("class", "");
    this.set("isShown", true);
    this.set("spacerIsShown", true);
    this.set("hide", () => {
      this.set("isShown", false);
    });

    await render<Context>(hbs`
      <div class={{this.class}}>
        {{#if this.spacerIsShown}}
          <div>
            Space
          </div>
        {{/if}}
        {{#if this.isShown}}
          <div class="anchor">
            <FloatingUI::Content
              @id="1"
              @anchor={{html-element '.anchor'}}
              @placement="bottom-start"
              @hide={{this.hide}}
            >
            </FloatingUI::Content>
          </div>
        {{/if}}
      </div>
    `);

    assert.dom(CONTENT_SELECTOR).exists();

    this.set("class", "is-dragging");

    assert
      .dom(CONTENT_SELECTOR)
      .exists("content is visible because the layout hasn't shifted");

    // Trigger a layout shift
    this.set("spacerIsShown", false);

    // Confirm that the content is hidden
    await waitUntil(() => {
      return !find(CONTENT_SELECTOR);
    });
  });

  todo("it runs a cleanup function on teardown", async function (assert) {
    assert.ok(false);
  });
});
