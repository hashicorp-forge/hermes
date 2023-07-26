import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { setupMirage } from "ember-cli-mirage/test-support";
import window from "ember-window-mock";
import { NEW_NAV_ITEM_LOCAL_STORAGE_KEY } from "hermes/components/header/nav";

const HIGHLIGHTED_NEW_TEXT_SELECTOR =
  ".highlighted-new .hds-dropdown-list-item__interactive-text";

module("Integration | Component | header/nav", function (hooks) {
  setupRenderingTest(hooks);
  setupWindowMock(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    let authenticatedUserSvc = this.owner.lookup(
      "service:authenticated-user"
    ) as AuthenticatedUserService;

    authenticatedUserSvc._info = {
      email: "foo@example.com",
      given_name: "Foo",
      name: "Foo Bar",
      picture: "",
      subscriptions: [],
    };
  });

  test("it renders correctly", async function (assert) {
    await render(hbs`<Header::Nav />`);

    assert.dom(".header-nav").exists();
    assert.dom('[data-test-nav-link="all"]').hasAttribute("href", "/all");
    assert.dom('[data-test-nav-link="my"]').hasAttribute("href", "/my");
    assert.dom('[data-test-nav-link="drafts"]').hasAttribute("href", "/drafts");

    assert.dom(".global-search").exists();

    await click("[data-test-user-menu-toggle]");

    assert.dom("[data-test-user-menu-title]").hasText("Foo Bar");
    assert.dom("[data-test-user-menu-email]").hasText("foo@example.com");

    assert.dom('[data-test-user-menu-item="support"]').hasText("Support");
    assert
      .dom('[data-test-user-menu-item="email-notifications"]')
      .hasText("Email notifications");
    assert.dom('[data-test-user-menu-item="sign-out"]').hasText("Sign out");
  });

  test("it shows an icon when the user menu has something to highlight", async function (assert) {
    window.localStorage.removeItem(NEW_NAV_ITEM_LOCAL_STORAGE_KEY);

    await render(hbs`<Header::Nav />`);

    assert
      .dom("[data-test-user-menu-highlight]")
      .exists("the highlight dot is shown");

    await click("[data-test-user-menu-toggle]");

    assert
      .dom("[data-test-user-menu-highlight]")
      .doesNotExist("highlight is hidden when the menu is open");

    assert
      .dom(HIGHLIGHTED_NEW_TEXT_SELECTOR)
      .hasPseudoElementStyle(
        "after",
        { content: '"New"' },
        "highlighted link has the correct class and pseudoElement text"
      );

    // close and reopen the menu
    await click("[data-test-user-menu-toggle]");
    await click("[data-test-user-menu-toggle]");

    assert
      .dom(HIGHLIGHTED_NEW_TEXT_SELECTOR)
      .doesNotExist('the "highlighted-new" class is removed');
  });
});
