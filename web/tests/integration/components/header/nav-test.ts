import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import window from "ember-window-mock";
import { HERMES_GITHUB_REPO_URL } from "hermes/utils/hermes-urls";
import ConfigService from "hermes/services/config";
import {
  TEST_USER_2_EMAIL,
  TEST_USER_2_GIVEN_NAME,
  TEST_USER_2_NAME,
} from "hermes/mirage/utils";
import { USER_MENU_TOGGLE } from "hermes/tests/helpers/selectors";

const SUPPORT_URL = "https://example.com/support";
const CREATE_NEW_BUTTON = "[data-test-create-new-button]";
const HIGHLIGHT_BADGE = ".highlighted-new-badge";

module("Integration | Component | header/nav", function (hooks) {
  setupRenderingTest(hooks);
  setupWindowMock(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: MirageTestContext) {
    let authenticatedUserSvc = this.owner.lookup(
      "service:authenticated-user",
    ) as AuthenticatedUserService;

    authenticatedUserSvc._info = this.server.create("person", {
      id: TEST_USER_2_EMAIL,
      email: TEST_USER_2_EMAIL,
      firstName: TEST_USER_2_GIVEN_NAME,
      name: TEST_USER_2_NAME,
      picture: "",
    }).attrs;
  });

  test("it renders correctly", async function (assert) {
    await render(hbs`
      <Header::Nav />
    `);

    assert.dom(".header-nav").exists();
    assert.dom('[data-test-nav-link="all"]').hasAttribute("href", "/documents");

    assert
      .dom('[data-test-nav-link="my"]')
      .hasAttribute("href", "/my/documents");

    assert.dom(CREATE_NEW_BUTTON).hasText("New").hasAttribute("href", "/new");

    assert.dom(".global-search").exists();

    await click(USER_MENU_TOGGLE);

    assert.dom("[data-test-user-menu-title]").hasText(TEST_USER_2_NAME);
    assert.dom("[data-test-user-menu-email]").hasText(TEST_USER_2_EMAIL);
    assert
      .dom("[data-test-user-menu-item='git-hub'] a")
      .hasText("GitHub")
      .hasAttribute("href", HERMES_GITHUB_REPO_URL);

    assert
      .dom('[data-test-user-menu-item="email-notifications"]')
      .containsText("Email notifications");

    assert.dom('[data-test-user-menu-item="sign-out"]').hasText("Sign out");
  });

  test("it shows an icon when the user menu has something to highlight", async function (assert) {
    await render(hbs`
      <Header::Nav />
    `);

    assert.equal(
      window.localStorage.getItem("emailNotificationsHighlightIsShown"),
      null,
    );

    assert.dom("[data-test-user-menu-highlight]").exists("highlight is shown");

    await click(USER_MENU_TOGGLE);

    assert
      .dom("[data-test-user-menu-highlight]")
      .doesNotExist("highlight is hidden when the menu is open");

    assert.dom(HIGHLIGHT_BADGE).hasText("New");

    // close and reopen the menu
    await click(USER_MENU_TOGGLE);
    await click(USER_MENU_TOGGLE);

    assert
      .dom(".highlighted-new")
      .doesNotExist("highlight is hidden after the menu is closed");
  });

  test("it renders a support link if it is configured", async function (assert) {
    // In assertion tests, Mirage automatically loads our mock config.
    // Rendering tests skip this step, so we need to do it manually.

    let mockConfigSvc = this.owner.lookup("service:config") as ConfigService;
    mockConfigSvc.config.support_link_url = SUPPORT_URL;

    await render(hbs`
      <Header::Nav />
    `);

    await click(USER_MENU_TOGGLE);

    assert
      .dom("[data-test-user-menu-item='support'] a")
      .hasText("Support")
      .hasAttribute("href", SUPPORT_URL);
  });
});
