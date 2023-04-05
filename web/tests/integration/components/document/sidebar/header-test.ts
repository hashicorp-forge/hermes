import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import window from "ember-window-mock";
import { HermesDocument } from "hermes/types/document";
import htmlElement from "hermes/utils/html-element";

interface DocumentSidebarHeaderTestContext extends MirageTestContext {
  document: HermesDocument;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  userHasScrolled: boolean;
}

module("Integration | Component | document/sidebar/header", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("it renders as expected", async function (this: DocumentSidebarHeaderTestContext, assert) {
    this.server.create("document", { objectID: "400" });
    this.set("document", this.server.schema.document.first().attrs);
    this.set("isCollapsed", false);
    this.set("userHasScrolled", false);
    this.set("toggleCollapsed", () => {
      this.set("isCollapsed", !this.isCollapsed);
    });

    await render(hbs`
      <Document::Sidebar::Header
        @document={{this.document}}
        @isCollapsed={{this.isCollapsed}}
        @toggleCollapsed={{this.toggleCollapsed}}
        @userHasScrolled={{this.userHasScrolled}}
      />
    `);

    const dashboardLinkSelector = "[data-test-sidebar-dashboard-link]";
    const copyURLButtonSelector = "[data-test-sidebar-copy-url-button]";
    const googleDocsLinkSelector = "[data-test-sidebar-google-docs-link]";
    const toggleButtonSelector = "[data-test-sidebar-toggle-button]";

    assert
      .dom(".sidebar-header")
      .doesNotHaveClass("scrolled", "scrolled class not yet applied");

    assert.dom(copyURLButtonSelector).exists("copyURLButton shown");
    assert.dom(googleDocsLinkSelector).exists("external link shown");
    assert
      .dom(dashboardLinkSelector)
      .hasText("Dashboard", "the dashboard text link is shown");

    assert
      .dom(dashboardLinkSelector + " .flight-icon")
      .hasAttribute("data-test-icon", "arrow-left", "back arrow is shown");
    assert
      .dom(toggleButtonSelector)
      .doesNotHaveAttribute(
        "data-test-is-collapsed",
        "the sidebar is not collapsed"
      );
    assert
      .dom(toggleButtonSelector + " .flight-icon")
      .hasAttribute(
        "data-test-icon",
        "sidebar-hide",
        "the collapse-sidebar icon is shown"
      );

    const externalLinkHref = htmlElement(googleDocsLinkSelector).getAttribute(
      "href"
    );
    const urlStart = "https://docs.google.com/document/d/";
    const docID = this.document.objectID;

    assert.equal(
      externalLinkHref,
      urlStart + docID,
      "Google Docs link is correct"
    );

    this.server.schema.document.first().update({ isDraft: true });

    this.set("document", this.server.schema.document.first().attrs);

    assert
      .dom(copyURLButtonSelector)
      .doesNotExist("copyURLButton hidden for drafts");

    await click(toggleButtonSelector);

    assert.dom(toggleButtonSelector).hasAttribute("data-test-is-collapsed");

    assert
      .dom(toggleButtonSelector + " .flight-icon")
      .hasAttribute(
        "data-test-icon",
        "sidebar-show",
        "the expand-sidebar icon is shown"
      );

    assert
      .dom(dashboardLinkSelector)
      .doesNotHaveTextContaining(
        "Dashboard",
        "dashboard text is not shown when sidebar is collapsed"
      );
    assert
      .dom(dashboardLinkSelector + " .flight-icon")
      .hasAttribute(
        "data-test-icon",
        "hashicorp",
        "the hashicorp logo becomes the dashboard link when the sidebar is collapsed"
      );

    this.set("userHasScrolled", true);

    assert
      .dom(".sidebar-header")
      .hasClass("scrolled", "scrolled class is applied when user scrolls");
  });
});
