import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import window from "ember-window-mock";
import { HermesDocument } from "hermes/types/document";
import htmlElement from "hermes/utils/html-element";
import ConfigService from "hermes/services/config";

interface DocumentSidebarHeaderTestContext extends MirageTestContext {
  document: HermesDocument;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  userHasScrolled: boolean;
}

module("Integration | Component | document/sidebar/header", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: DocumentSidebarHeaderTestContext) {
    this.set("isCollapsed", false);
    this.set("userHasScrolled", false);
    this.set("toggleCollapsed", () => {
      this.set("isCollapsed", !this.isCollapsed);
    });
  });

  test("it renders as expected", async function (this: DocumentSidebarHeaderTestContext, assert) {
    this.server.create("document", { objectID: "400" });
    this.set("document", this.server.schema.document.first().attrs);

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
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

  test("it populates the correct share link (with ShortLinkBaseURL)", async function (this: DocumentSidebarHeaderTestContext, assert) {
    this.server.create("document", { docType: "PRD", docNumber: "TST-001" });
    this.set("document", this.server.schema.document.first().attrs);

    let configService = this.owner.lookup("service:config") as ConfigService;

    let shortLinkBaseURL = "http://short.link/";

    configService.config.short_link_base_url = shortLinkBaseURL;

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Document::Sidebar::Header
        @document={{this.document}}
        @isCollapsed={{this.isCollapsed}}
        @toggleCollapsed={{this.toggleCollapsed}}
        @userHasScrolled={{this.userHasScrolled}}
      />
    `);

    let copyURLButton: HTMLElement | null = null;
    let url: string | null = null;

    const captureBaseURL = () => {
      copyURLButton = htmlElement("[data-test-copy-url-button]");
      url = copyURLButton.getAttribute("data-test-copy-url-value");
    };

    captureBaseURL();

    assert.equal(
      url,
      `${shortLinkBaseURL}prd/tst-001`,
      "the correct share link is populated"
    );

    this.clearRender();

    shortLinkBaseURL = "http://short.link";

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Document::Sidebar::Header
        @document={{this.document}}
        @isCollapsed={{this.isCollapsed}}
        @toggleCollapsed={{this.toggleCollapsed}}
        @userHasScrolled={{this.userHasScrolled}}
      />
    `);

    captureBaseURL();

    assert.equal(
      url,
      `${shortLinkBaseURL}/prd/tst-001`,
      "a trailing slash is added to the ShortLinkBaseURL if it is missing"
    );

    this.clearRender();
    configService.config.short_link_base_url = undefined as unknown as string;

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Document::Sidebar::Header
        @document={{this.document}}
        @isCollapsed={{this.isCollapsed}}
        @toggleCollapsed={{this.toggleCollapsed}}
        @userHasScrolled={{this.userHasScrolled}}
      />
    `);

    captureBaseURL();

    assert.equal(
      url,
      window.location.href,
      "uses the current URL if ShortLinkBaseURL is undefined"
    );

    this.clearRender();
    configService.config.short_link_base_url = "invalidURL";

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Document::Sidebar::Header
        @document={{this.document}}
        @isCollapsed={{this.isCollapsed}}
        @toggleCollapsed={{this.toggleCollapsed}}
        @userHasScrolled={{this.userHasScrolled}}
      />
    `);

    captureBaseURL();

    assert.equal(
      url,
      window.location.href,
      "uses the current URL if ShortLinkBaseURL is invalid"
    );
  });
});
