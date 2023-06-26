import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

const CONTAINER_SELECTOR = ".sidebar-section-header-container";
const BUTTON_SELECTOR = ".sidebar-section-header-button";

interface DocumentSidebarSectionHeaderTestContext extends TestContext {
  title: string;
  buttonLabel?: string;
  buttonAction?: () => void;
  buttonIcon?: string;
}

module("Integration | Component | document/sidebar/header", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected (title only)", async function (this: DocumentSidebarSectionHeaderTestContext, assert) {
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
        'renders the title in the "container" element with the correct class and className'
      );
  });

  test("it renders as expected (title and button)", async function (this: DocumentSidebarSectionHeaderTestContext, assert) {
    this.set("buttonIcon", null);
    this.set("buttonAction", () => {
      this.set("buttonIcon", "check");
    });

    await render<DocumentSidebarSectionHeaderTestContext>(hbs`
      <Document::Sidebar::SectionHeader
        @title="Click the plus to check"
        @buttonLabel="Click me"
        @buttonIcon={{this.buttonIcon}}
        @buttonAction={{this.buttonAction}}
        class="foo"
      />
    `);

    assert.dom(BUTTON_SELECTOR).exists().hasAttribute("aria-label", "Click me");
    assert.dom(".flight-icon-plus").exists();
    assert.dom(".flight-icon-check").doesNotExist();

    // test that the action works
    await click(BUTTON_SELECTOR);
    assert.dom(".flight-icon-plus").doesNotExist();
    assert.dom(".flight-icon-check").exists();
  });
});
