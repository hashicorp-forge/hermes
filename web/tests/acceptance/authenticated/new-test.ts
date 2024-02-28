import { visit, waitFor } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { Response } from "miragejs";

const TEMPLATE_OPTION = "[data-test-template-option]";
const ICON = `${TEMPLATE_OPTION} [data-test-icon]`;
const LONG_NAME = `${TEMPLATE_OPTION} [data-test-long-name]`;
const NAME = `${TEMPLATE_OPTION} [data-test-name]`;
const DESCRIPTION = `${TEMPLATE_OPTION} [data-test-description]`;
const MORE_INFO_LINK = `[data-test-more-info-link]`;
const START_A_PROJECT_BUTTON = "[data-test-start-a-project-button]";

interface AuthenticatedNewRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/new", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: AuthenticatedNewRouteTestContext) {
    await authenticateSession({});

    this.server.create("document-type", {
      name: "FD",
      longName: "Foo Document",
      description: "Foo",
      moreInfoLink: {
        text: "Foo",
        url: "https://example.com/foo",
      },
    });

    this.server.create("document-type", {
      name: "RFC",
      longName: "Request for Comments",
      description: "RFC",
      flightIcon: "square",
    });

    this.server.create("document-type", {
      name: "MEMO",
      longName: "Memo",
      description: "Memo",
      moreInfoLink: {
        text: "Memo",
        url: "https://example.com/memo",
      },
    });
  });

  test("the page title is correct", async function (this: AuthenticatedNewRouteTestContext, assert) {
    await visit("/new");
    await waitFor("h1");
    assert.equal(getPageTitle(), "Choose a template | Hermes");
  });

  test("it renders as expected", async function (this: AuthenticatedNewRouteTestContext, assert) {
    await visit("/new");

    assert.dom(TEMPLATE_OPTION).exists({ count: 3 });

    const expectedLongNames = ["Foo Document", "Request for Comments", "Memo"];

    assert.deepEqual(
      [...document.querySelectorAll(LONG_NAME)].map(
        (el) => el.textContent?.trim(),
      ),
      expectedLongNames,
    );

    const expectedDescriptions = ["Foo", "RFC", "Memo"];

    assert.deepEqual(
      [...document.querySelectorAll(DESCRIPTION)].map(
        (el) => el.textContent?.trim(),
      ),
      expectedDescriptions,
    );

    // We don't expect "MEMO" because it's basically the same as "Memo"

    const expectedNames = ["FD", "RFC"];

    assert.deepEqual(
      [...document.querySelectorAll(NAME)].map((el) => el.textContent?.trim()),
      expectedNames,
    );

    // `file-text` is the default icon
    // `square` is the icon we just set for RFC.

    const expectedIcons = ["file-text", "square", "file-text"];

    assert.deepEqual(
      [...document.querySelectorAll(ICON)].map((el) =>
        el.getAttribute("data-test-icon"),
      ),
      expectedIcons,
    );

    assert.dom(MORE_INFO_LINK).exists({ count: 2 });

    const expectedLinkText = ["Foo", "Memo"];
    const expectedLinkHREFs = [
      "https://example.com/foo",
      "https://example.com/memo",
    ];

    assert.deepEqual(
      [...document.querySelectorAll(MORE_INFO_LINK)].map((el) =>
        el.getAttribute("href"),
      ),
      expectedLinkHREFs,
    );

    assert.deepEqual(
      [...document.querySelectorAll(MORE_INFO_LINK)].map(
        (el) => el.textContent?.trim(),
      ),
      expectedLinkText,
    );

    assert.dom(START_A_PROJECT_BUTTON).exists();
  });

  test(`it doesn't render the "more info" links if they're not present`, async function (this: AuthenticatedNewRouteTestContext, assert) {
    this.server.db.emptyData();

    this.server.create("document-type", {
      name: "BD",
      longName: "Bar Document",
      description: "Bar",
    });

    await visit("/new");

    assert.dom(MORE_INFO_LINK).doesNotExist();
  });
});
