import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { click, render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import window from "ember-window-mock";
import theme from "tailwindcss/defaultTheme";
import htmlElement from "hermes/utils/html-element";
import { RECENTLY_VIEWED_DOCS_SCROLL_AMOUNT } from "hermes/components/dashboard/recently-viewed";
import RecentlyViewedService from "hermes/services/recently-viewed";
import ViewportService from "hermes/services/viewport";

const NO_VIEWED_DOCS = "[data-test-no-viewed-docs]";
const DOC = "[data-test-recently-viewed-doc]";
const SCROLL_BACK_BUTTON = "[data-test-scroll-back]";
const SCROLL_FORWARD_BUTTON = "[data-test-scroll-forward]";
const LIST = "[data-test-recently-viewed-docs]";

interface Context extends MirageTestContext {}

module("Integration | Component | dashboard/recently-viewed", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("if recently viewed is empty, it shows a message", async function (this: Context, assert) {
    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(NO_VIEWED_DOCS).exists();
    assert.dom(DOC).doesNotExist();
  });

  test("it lists recently viewed docs", async function (this: Context, assert) {
    this.server.create("recently-viewed", { id: "1", isDraft: false });
    this.server.create("recently-viewed", { id: "2", isDraft: true });

    this.server.create("document", { objectID: "1", title: "Foo" });
    this.server.create("document", { objectID: "2", title: "Bar" });

    const recentlyViewedDocs = this.owner.lookup(
      "service:recently-viewed-docs",
    ) as RecentlyViewedService;

    await recentlyViewedDocs.fetchAll.perform();

    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(DOC).exists({ count: 2 });

    assert
      .dom(`${DOC} a`)
      .containsText("Foo")
      .hasAttribute("href", "/document/1", "correct href for a published doc");

    assert
      .dom(`${DOC}:nth-child(2) a`)
      .containsText("Bar")
      .hasAttribute(
        "href",
        "/document/2?draft=true",
        "correct href for a draft",
      );
  });
});
