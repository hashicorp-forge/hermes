import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import RecentlyViewedService from "hermes/services/recently-viewed";

const NO_VIEWED_DOCS = "[data-test-no-viewed-docs]";
const DOC = "[data-test-recently-viewed-doc]";

interface Context extends MirageTestContext {}

module("Integration | Component | dashboard/recently-viewed", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("if the recently viewed docs is empty, it shows a message", async function (this: Context, assert) {
    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(NO_VIEWED_DOCS).exists();
    assert.dom(DOC).doesNotExist();
  });

  test("it lists recently viewed docs", async function (this: Context, assert) {
    const oldestViewedTitle = "Foo";
    const newestViewedTitle = "Baz";

    this.server.create("document", {
      id: "1",
      objectID: "1",
      isDraft: false,
      title: oldestViewedTitle,
    });

    this.server.create("recently-viewed-doc", {
      id: "1",
      isDraft: false,
      viewedTime: 1, // oldest
    });

    this.server.create("document", {
      id: "3",
      objectID: "3",
      title: newestViewedTitle,
    });

    this.server.create("recently-viewed-doc", {
      id: "3",
      isDraft: true,
      viewedTime: 3, // newest
    });

    const recentlyViewedDocs = this.owner.lookup(
      "service:recently-viewed",
    ) as RecentlyViewedService;

    await recentlyViewedDocs.fetchAll.perform();

    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(DOC).exists({ count: 2 });

    const allItems = document.querySelectorAll(DOC);
    const [firstItem, secondItem] = allItems;

    assert
      .dom(firstItem)
      .containsText(newestViewedTitle)
      .hasAttribute("href", "/document/3?draft=true");

    assert
      .dom(secondItem)
      .containsText(oldestViewedTitle)
      .hasAttribute("href", "/document/1");
  });
});
