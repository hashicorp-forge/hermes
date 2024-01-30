import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { DocumentSidebarFooterButton } from "hermes/components/document/sidebar/footer";

const READ_ONLY = "[data-test-read-only]";
const READ_ONLY_HEADLINE = "[data-test-read-only-footer-headline]";
const READ_ONLY_PARAGRAPH = "[data-test-read-only-footer-paragraph]";
const READ_ONLY_DOC_NOTE = "[data-test-read-only-doc-note]";
const CONTROLS = "[data-test-footer-controls]";
const LOCKED_DOC_LINK = "[data-test-locked-doc-link]";
const SECONDARY_BUTTON = "[data-test-sidebar-footer-secondary-button]";
const PRIMARY_BUTTON = "[data-test-sidebar-footer-primary-button]";

interface Context extends MirageTestContext {
  primaryButtonAttrs: DocumentSidebarFooterButton;
  secondaryButtonAttrs: DocumentSidebarFooterButton;
  secondaryButtonIsShown: boolean;
  isReadOnly: boolean;
  docIsLocked: boolean;
}

module("Integration | Component | document/sidebar/footer", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    this.set("primaryButtonAttrs", {
      text: "Save",
      action: () => {},
    });

    this.set("secondaryButtonAttrs", {
      text: "Cancel",
      action: () => {},
    });
  });

  test("it can render a read-only mode", async function (this: Context, assert) {
    this.set("isReadOnly", false);
    this.set("docIsLocked", false);

    await render<Context>(hbs`
      <Document::Sidebar::Footer
        @isReadOnly={{this.isReadOnly}}
        @docIsLocked={{this.docIsLocked}}
        @primaryButtonAttrs={{this.primaryButtonAttrs}}
      />
    `);

    assert.dom(READ_ONLY).doesNotExist();
    assert.dom(CONTROLS).exists();

    this.set("isReadOnly", true);

    assert.dom(READ_ONLY).exists();
    assert.dom(CONTROLS).doesNotExist();

    assert.dom(READ_ONLY_HEADLINE).hasText("Read-only headers");
    assert
      .dom(READ_ONLY_PARAGRAPH)
      .hasText("Weʼre unable to edit the metadata of files created offsite.");

    assert.dom(LOCKED_DOC_LINK).doesNotExist();
    assert.dom(READ_ONLY_DOC_NOTE).exists();

    this.set("docIsLocked", true);

    assert.dom(READ_ONLY_HEADLINE).hasText("Document is locked");
    assert
      .dom(READ_ONLY_PARAGRAPH)
      .hasText(
        "Due to a Google API bug, all suggestions must be removed from the document header to unlock.",
      );

    assert.dom(LOCKED_DOC_LINK).exists();
    assert.dom(READ_ONLY_DOC_NOTE).doesNotExist();
  });

  test("the primary button renders as expected", async function (this: Context, assert) {
    let count = 0;

    const text = "Foo";
    const action = () => count++;

    this.set("primaryButtonAttrs", {
      text,
      action,
    });

    await render<Context>(hbs`
      <Document::Sidebar::Footer
        @primaryButtonAttrs={{this.primaryButtonAttrs}}
      />
    `);

    assert.dom(PRIMARY_BUTTON).hasText(text);

    await click(PRIMARY_BUTTON);

    assert.equal(count, 1, "it runs the passed-in action");
  });

  test("it conditionally renders a secondary button", async function (this: Context, assert) {
    this.set("secondaryButtonIsShown", false);

    await render<Context>(hbs`
      <Document::Sidebar::Footer
        @primaryButtonAttrs={{this.primaryButtonAttrs}}
        @secondaryButtonAttrs={{this.secondaryButtonAttrs}}
        @secondaryButtonIsShown={{this.secondaryButtonIsShown}}
      />
    `);

    assert.dom(SECONDARY_BUTTON).doesNotExist();

    this.set("secondaryButtonIsShown", true);

    assert.dom(SECONDARY_BUTTON).exists();
  });

  test("the secondary button renders as expected", async function (this: Context, assert) {
    let count = 0;

    const text = "Archive";
    const action = () => count++;
    const icon = "archive";

    this.set("secondaryButtonAttrs", {
      text,
      action,
      icon,
    });

    await render<Context>(hbs`
      <Document::Sidebar::Footer
        @primaryButtonAttrs={{this.primaryButtonAttrs}}
        @secondaryButtonAttrs={{this.secondaryButtonAttrs}}
        @secondaryButtonIsShown={{true}}
      />
    `);

    assert.dom(SECONDARY_BUTTON).hasText(text).isNotDisabled();
    assert
      .dom(SECONDARY_BUTTON + " .flight-icon")
      .hasAttribute("data-test-icon", icon, "it renders the passed-in icon");

    await click(SECONDARY_BUTTON);

    assert.equal(count, 1, "it runs the passed-in action");

    this.set("secondaryButtonAttrs.isDisabled", true);

    assert.dom(SECONDARY_BUTTON).isDisabled();

    this.set("secondaryButtonAttrs.isIconOnly", true);

    assert.dom(SECONDARY_BUTTON).hasText("");
  });
});
