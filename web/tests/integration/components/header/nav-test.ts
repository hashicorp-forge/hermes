import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { setupMirage } from "ember-cli-mirage/test-support";
import window from "ember-window-mock";

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
      employee_id: "",
      department : "",
      organization: "",
      profile     : "",
      role : "",
      subscriptions: [],
    };
  });

  test("it renders correctly", async function (assert) {
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::Nav />
    `);

    assert.dom(".header-nav").exists();
    assert.dom('[data-test-nav-link="all"]').hasAttribute("href", "/all");
    assert.dom('[data-test-nav-link="my"]').hasAttribute("href", "/my");
    assert.dom('[data-test-nav-link="drafts"]').hasAttribute("href", "/drafts");

    assert.dom(".global-search").exists();

    await click("[data-test-user-menu-toggle]");

    assert.dom("[data-test-user-menu-title]").hasText("Foo Bar");
    assert.dom("[data-test-user-menu-email]").hasText("foo@example.com");

    assert
      .dom('[data-test-user-menu-item="email-notifications"]')
      .hasText("Email notifications");

    assert.dom('[data-test-user-menu-item="sign-out"]').hasText("Sign out");
  });

  test("it shows an icon when the user menu has something to highlight", async function (assert) {
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Header::Nav />
    `);

    assert.equal(
      window.localStorage.getItem("emailNotificationsHighlightIsShown"),
      null
    );

    assert.dom("[data-test-user-menu-highlight]").exists("highlight is shown");

    await click("[data-test-user-menu-toggle]");

    assert
      .dom("[data-test-user-menu-highlight]")
      .doesNotExist("highlight is hidden when the menu is open");

    assert
      .dom(".highlighted-new .hds-dropdown-list-item__interactive-text")
      .hasPseudoElementStyle(
        "after",
        { content: '"New"' },
        "highlighted link has the correct class and pseudoElement text"
      );

    // close and reopen the menu
    await click("[data-test-user-menu-toggle]");
    await click("[data-test-user-menu-toggle]");

    assert
      .dom(".highlighted-new")
      .doesNotExist("highlight is hidden after the menu is closed");
  });
});
