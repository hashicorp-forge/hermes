import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";
import { OffsetOptions } from "@floating-ui/dom";

const DEFAULT_CONTENT_OFFSET = 5;

interface FloatingUIComponentTestContext extends TestContext {
  renderOut?: boolean;
  offset?: OffsetOptions;
}

module("Integration | Component | floating-u-i/content", function (hooks) {
  setupRenderingTest(hooks);

  test("it can be rendered inline or outside", async function (this: FloatingUIComponentTestContext, assert) {
    this.set("renderOut", false);

    await render<FloatingUIComponentTestContext>(hbs`
      <div class="anchor">
        Attach here
      </div>

      <div class="container">
        <FloatingUI::Content
          @id="1"
          @anchor={{html-element '.anchor'}}
          @renderOut={{this.renderOut}}
        >
          Content
        </FloatingUI::Content>
      </div>
    `);

    assert
      .dom(".container .hermes-floating-ui-content")
      .exists("content is rendered inline by default");

    this.set("renderOut", true);

    assert
      .dom(".container .hermes-floating-ui-content")
      .doesNotExist("content is rendered outside its container");

    assert
      .dom(".ember-application .hermes-floating-ui-content")
      .exists("content is rendered in the root element");
  });

  test("it is positioned by floating-ui", async function (this: FloatingUIComponentTestContext, assert) {
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

    await render<FloatingUIComponentTestContext>(hbs`
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
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    let anchor = htmlElement(".anchor");
    let content = htmlElement(".hermes-floating-ui-content");

    setVariables(anchor, content);

    assert.ok(content.getAttribute("data-floating-ui-placement") === "left");
    assert.ok(
      contentRight === anchorLeft - DEFAULT_CONTENT_OFFSET,
      "content is offset to the left of the anchor"
    );
    assert.ok(
      contentWidth === 100,
      "the correct width was splatted to the content element"
    );

    // Clear and set the placement to 'right'

    this.clearRender();

    await render<FloatingUIComponentTestContext>(hbs`
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
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    anchor = htmlElement(".anchor");
    content = htmlElement(".hermes-floating-ui-content");

    setVariables(anchor, content);

    assert.ok(content.getAttribute("data-floating-ui-placement") === "right");
    assert.ok(
      contentLeft === anchorRight + DEFAULT_CONTENT_OFFSET,
      "content is offset to the right of anchor"
    );
  });

  test("it can use a custom offset", async function (this: FloatingUIComponentTestContext, assert) {
    await render(hbs`
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
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    let anchor = htmlElement(".anchor");
    let content = htmlElement(".hermes-floating-ui-content");
    let contentWidth = content.offsetWidth;
    let contentRight = content.offsetLeft + contentWidth;
    let anchorLeft = anchor.offsetLeft;

    assert.equal(
      contentRight,
      anchorLeft - DEFAULT_CONTENT_OFFSET,
      "content is offset to the left of the anchor"
    );

    // Clear and set the offset to 10
    this.clearRender();
    this.set("offset", 10);

    await render<FloatingUIComponentTestContext>(hbs`
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
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    anchor = htmlElement(".anchor");
    content = htmlElement(".hermes-floating-ui-content");
    contentWidth = content.offsetWidth;
    contentRight = content.offsetLeft + contentWidth;
    anchorLeft = anchor.offsetLeft;

    assert.equal(
      contentRight,
      anchorLeft - 10,
      "content is offset by the passed-in value"
    );
  });

  test('it can be positioned "none"', async function (this: FloatingUIComponentTestContext, assert) {
    await render(hbs`
      <div class="grid place-items-center w-full h-full">
        <div>
          <div class="anchor" style="width: 100px">
            Attach
          </div>
          <FloatingUI::Content
            style="width: 100px"
            @id="1"
            @anchor={{html-element '.anchor'}}
            @placement="none"
          >
            Content
          </FloatingUI::Content>
        </div>
      </div>
    `);

    let content = htmlElement(".hermes-floating-ui-content");

    assert.equal(
      content.getAttribute("data-floating-ui-placement"),
      "none",
      "content is not positioned"
    );

    await this.pauseTest();
  });

  todo("it runs a cleanup function on teardown", async function (assert) {
    assert.ok(false);
  });
});
