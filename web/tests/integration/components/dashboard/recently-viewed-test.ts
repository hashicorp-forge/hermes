import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import RecentlyViewedService from "hermes/services/recently-viewed";

const NO_RECENTLY_VIEWED = "[data-test-no-recently-viewed]";
const ITEM = "[data-test-recently-viewed-item]";

interface Context extends MirageTestContext {
  recentlyViewed: RecentlyViewedService;
}

module("Integration | Component | dashboard/recently-viewed", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    this.set(
      "recentlyViewed",
      this.owner.lookup("service:recently-viewed") as RecentlyViewedService,
    );
  });

  test("if recently viewed is empty, it shows a message", async function (this: Context, assert) {
    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(NO_RECENTLY_VIEWED).exists();
    assert.dom(ITEM).doesNotExist();

    this.server.create("recently-viewed-doc");

    await this.recentlyViewed.fetchAll.perform();

    await rerender();

    assert.dom(NO_RECENTLY_VIEWED).doesNotExist();
    assert.dom(ITEM).exists({ count: 1 });
  });

  test("it lists recently viewed projects and docs", async function (this: Context, assert) {
    const oldestViewedTitle = "Foo";
    const middleViewedTitle = "Bar";
    const newestViewedTitle = "Baz";

    this.server.create("document", {
      id: "1",
      objectID: "1",
      isDraft: false,
      status: "In-Review",
      title: oldestViewedTitle,
    });

    this.server.create("recently-viewed-doc", {
      id: "1",
      viewedTime: 1, // oldest
    });

    this.server.create("project", { id: "2", title: middleViewedTitle });

    this.server.create("recently-viewed-project", {
      id: "2",
      viewedTime: 2, // middle
    });

    this.server.create("document", {
      id: "3",
      objectID: "3",
      title: newestViewedTitle,
    });

    this.server.create("recently-viewed-doc", {
      id: "3",
      viewedTime: 3, // newest
    });

    await this.recentlyViewed.fetchAll.perform();

    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(ITEM).exists({ count: 3 });

    const allItems = document.querySelectorAll(ITEM);

    const [first, second, third] = allItems;

    assert
      .dom(first)
      .containsText(newestViewedTitle)
      .hasAttribute("href", "/document/3?draft=true");

    assert
      .dom(second)
      .containsText(middleViewedTitle)
      .hasAttribute("href", "/projects/2");

    assert
      .dom(third)
      .containsText(oldestViewedTitle)
      .hasAttribute("href", "/document/1");
  });

  todo(
    "it scrolls to the right when the forward button is clicked",
    async function (this: Context, assert) {
      // TODO: Configure breakpoint tests
      // https://crunchingnumbers.live/2020/06/07/container-queries-cross-resolution-testing/

      assert.true(false);
    },
  );
});
