import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import window from "ember-window-mock";
import { HermesDocument } from "hermes/types/document";
import htmlElement from "hermes/utils/html-element";
import ConfigService from "hermes/services/config";

interface DocumentSidebarSectionHeaderTestContext extends MirageTestContext {
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

    assert.dom(".foo .sidebar-section-header").hasText("Hello World");
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

    assert.dom(".foo").hasText("Click the plus to check");
    assert.dom('.flight-icon-plus').exists();
    assert.dom('.flight-icon-check').doesNotExist();

    // test that the action works
    await click(".foo .sidebar-section-header button");
    assert.dom('.flight-icon-plus').doesNotExist();
    assert.dom('.flight-icon-check').exists();
  });
});
