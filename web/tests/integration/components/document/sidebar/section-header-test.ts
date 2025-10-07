import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { SIDEBAR_SECTION_HEADER_BUTTON, TOOLTIP } from "hermes/tests/helpers/selectors";

const CONTAINER_SELECTOR = ".sidebar-section-header-container";

interface Context extends TestContext {
  title: string;
  buttonLabel?: string;
  buttonAction?: () => void;
  buttonIcon?: string;
  buttonIsDisabled?: boolean;
  disabledButtonTooltipText?: string;
}

module("Integration | Component | document/sidebar/header", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected (title only)", async function (this: Context, assert) {
    await render(hbs`
      <Document::Sidebar::SectionHeader
        @title="Hello World"
        class="foo"
      />
    `);

    assert
      .dom(`.foo${CONTAINER_SELECTOR}`)
      .hasText(
        "Hello World",
        'renders the title in the "container" element with the correct class and className',
      );
  });

  test("it renders as expected (title and button)", async function (this: Context, assert) {
    this.set("buttonIcon", null);
    this.set("buttonAction", () => {
      this.set("buttonIcon", "check");
    });

    await render<Context>(hbs`
      <Document::Sidebar::SectionHeader
        @title="Click the plus to check"
        @buttonLabel="Click me"
        @buttonIcon={{this.buttonIcon}}
        @buttonAction={{this.buttonAction}}
        class="foo"
      />
    `);

    assert.dom(SIDEBAR_SECTION_HEADER_BUTTON).exists().hasAttribute("aria-label", "Click me");
    assert.dom(".flight-icon-plus").exists();
    assert.dom(".flight-icon-check").doesNotExist();

    // test that the action works
    await click(SIDEBAR_SECTION_HEADER_BUTTON);
    assert.dom(".flight-icon-plus").doesNotExist();
    assert.dom(".flight-icon-check").exists();
  });

  test("it can be disabled with an optional tooltip", async function (this: Context, assert) {
    let count = 0;

    this.set("buttonIsDisabled", false);
    this.set("disabledButtonTooltipText", undefined);
    this.set("buttonAction", () => count++);

    await render<Context>(hbs`
      <Document::Sidebar::SectionHeader
        @title="Hello World"
        @buttonLabel="Click me"
        @buttonAction={{this.buttonAction}}
        @buttonIsDisabled={{this.buttonIsDisabled}}
        @disabledButtonTooltipText={{this.disabledButtonTooltipText}}
      />
    `);

    assert.dom(SIDEBAR_SECTION_HEADER_BUTTON).doesNotHaveAttribute("aria-disabled");

    this.set("buttonIsDisabled", true);

    assert.dom(SIDEBAR_SECTION_HEADER_BUTTON).hasAttribute("aria-disabled");

    await triggerEvent(SIDEBAR_SECTION_HEADER_BUTTON, "mouseenter");

    assert.dom(".hermes-tooltip").doesNotExist();

    this.set("disabledButtonTooltipText", "This is a tooltip");

    await triggerEvent(SIDEBAR_SECTION_HEADER_BUTTON, "mouseenter");

    assert.dom(".hermes-tooltip").exists().hasText("This is a tooltip");

    await click(SIDEBAR_SECTION_HEADER_BUTTON);

    assert.equal(
      count,
      0,
      "the action is not called when the button is disabled",
    );
  });
});
