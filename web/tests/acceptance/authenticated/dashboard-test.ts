import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const RECENTLY_VIEWED_DOC_SELECTOR = "[data-test-recently-viewed-doc]";

interface AuthenticatedDashboardRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/dashboard", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");
    assert.equal(getPageTitle(), "Dashboard | Hermes");
  });

  test("recently viewed docs have the correct href", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    this.server.create("recently-viewed-doc", { id: "1", isDraft: false });
    this.server.create("recently-viewed-doc", { id: "2", isDraft: true });

    this.server.create("document", { objectID: "1", title: "Foo" });
    this.server.create("document", { objectID: "2", title: "Bar" });

    await visit("/dashboard");

    assert.dom(RECENTLY_VIEWED_DOC_SELECTOR).exists({ count: 2 });

    assert
      .dom(RECENTLY_VIEWED_DOC_SELECTOR)
      .containsText("Foo")
      .hasAttribute("href", "/document/1");

    assert
      .dom(`${RECENTLY_VIEWED_DOC_SELECTOR}:nth-child(2)`)
      .containsText("Bar")
      .hasAttribute("href", "/document/2?draft=true");
  });
});
