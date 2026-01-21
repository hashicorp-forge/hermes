import {
  click,
  fillIn,
  find,
  triggerKeyEvent,
  visit,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { Response } from "miragejs";
import RouterService from "@ember/routing/router-service";
import window from "ember-window-mock";
import { DRAFT_CREATED_LOCAL_STORAGE_KEY } from "hermes/components/modals/draft-created";
import { TEST_WEB_CONFIG } from "hermes/mirage/utils";

// Selectors
const DOC_FORM = "[data-test-new-doc-form]";
const HEADLINE = "[data-test-form-headline]";
const ICON = "[data-test-feature-icon]";
const PRODUCT_SELECT = `[data-test-product-select]`;
const PRODUCT_SELECT_TOGGLE = `${PRODUCT_SELECT} [data-test-x-dropdown-list-toggle-select]`;
const CREATE_BUTTON = `${DOC_FORM} [data-test-submit]`;
const SECONDARY_CREATE_BUTTON = `${DOC_FORM} .hds-button--color-secondary`;
const PRIMARY_CREATE_BUTTON = `${DOC_FORM} .hds-button--color-primary`;
const TITLE_INPUT = `${DOC_FORM} [data-test-title-input]`;
const TITLE_ERROR = `${DOC_FORM} [data-test-title-error]`;
const SUMMARY_INPUT = `${DOC_FORM} [data-test-summary-input]`;
const PRODUCT_SELECT_ITEM = `${PRODUCT_SELECT} [data-test-x-dropdown-list-item]`;
const PRODUCT_ERROR = `${DOC_FORM} [data-test-product-error]`;
const FIRST_PRODUCT_SELECT_ITEM_BUTTON = `${PRODUCT_SELECT_ITEM}:first-child button`;
const CREATING_NEW_DOC_DESCRIPTION = "[data-test-task-is-running-description]";
const FLASH_NOTIFICATION = "[data-test-flash-notification]";
const DRAFT_CREATED_MODAL = "[data-test-draft-created-modal]";

interface AuthenticatedNewDocRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/new/doc", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: AuthenticatedNewDocRouteTestContext) {
    await authenticateSession({});
  });

  test("the page title is correct (RFC)", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    await visit("/new/doc?docType=RFC");
    assert.equal(getPageTitle(), "Create Your RFC | Hermes");
  });

  test("the page title is correct (PRD)", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    await visit("/new/doc?docType=PRD");
    assert.equal(getPageTitle(), "Create Your PRD | Hermes");
  });

  test("the product/area can be set", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 4);

    // add a product with an icon
    this.server.create("product", {
      name: "Terraform",
      abbreviation: "TF",
    });

    await visit("/new/doc?docType=RFC");

    assert.dom(PRODUCT_SELECT_TOGGLE).exists();
    assert
      .dom(`${PRODUCT_SELECT_TOGGLE} span`)
      .hasText("Select a product/area");
    assert
      .dom(`${PRODUCT_SELECT_TOGGLE} .flight-icon`)
      .hasAttribute("data-test-icon", "folder");

    await click(PRODUCT_SELECT_TOGGLE);

    const lastItemSelector = `${PRODUCT_SELECT_ITEM}:last-child`;

    assert.dom(PRODUCT_SELECT_ITEM).exists({ count: 5 });
    assert.dom(lastItemSelector).hasText("Terraform TF");
    assert
      .dom(lastItemSelector + " .flight-icon")
      .hasAttribute("data-test-icon", "terraform");

    await click(lastItemSelector + " button");

    assert.dom(PRODUCT_SELECT_TOGGLE).hasText("Terraform TF");
    assert
      .dom(PRODUCT_SELECT_TOGGLE + " .flight-icon")
      .hasAttribute("data-test-icon", "terraform");
  });

  test("it shows a loading screen while a doc is being created", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);
    await visit("/new/doc?docType=RFC");

    assert.dom(HEADLINE).hasText("Create your RFC");
    assert.dom(ICON).hasAttribute("data-test-icon", "discussion-circle");
    assert.dom(CREATING_NEW_DOC_DESCRIPTION).doesNotExist();

    await fillIn(TITLE_INPUT, "Foo");
    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    const clickPromise = click(CREATE_BUTTON);

    await waitFor(CREATING_NEW_DOC_DESCRIPTION);

    assert.dom(HEADLINE).hasText("Creating draft in Google Drive...");
    assert.dom(ICON).hasAttribute("data-test-icon", "running");
    assert
      .dom(CREATING_NEW_DOC_DESCRIPTION)
      .hasText("This usually takes 10-20 seconds.");

    await clickPromise;
  });

  test("it shows an error screen if the doc creation fails", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    this.server.post("/drafts", () => {
      return new Response(500);
    });

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT, "Foo");
    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    const clickPromise = click(CREATE_BUTTON);

    await waitFor(FLASH_NOTIFICATION);

    assert
      .dom(FLASH_NOTIFICATION)
      .containsText("Error creating document draft");

    await clickPromise;
  });

  test("it redirects to the doc page if the doc is created successfully", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.create("product", {
      name: "Terraform",
    });

    // Turn off the modal
    window.localStorage.setItem(DRAFT_CREATED_LOCAL_STORAGE_KEY, "true");

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT, "Foo");

    await fillIn(SUMMARY_INPUT, "Bar");

    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    await click(CREATE_BUTTON);

    const routerService = this.owner.lookup("service:router") as RouterService;

    assert.equal(routerService.currentRouteName, "authenticated.document");
    assert.equal(routerService.currentURL, "/document/1?draft=true");

    assert.dom("[data-test-document-title]").includesText("Foo");
    assert.dom("[data-test-document-summary]").includesText("Bar");
    assert.dom(PRODUCT_SELECT_TOGGLE).includesText("Terraform");
  });

  test("it shows a confirmation flash message when a draft is created (when creating draft as the user)", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.get("/web/config", () => {
      return new Response(
        200,
        {},
        JSON.stringify({ ...TEST_WEB_CONFIG, create_docs_as_user: true }),
      );
    });

    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT, "Foo");
    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    await click(CREATE_BUTTON);

    await waitFor(FLASH_NOTIFICATION);

    assert.dom(FLASH_NOTIFICATION).hasText("Draft created!");
  });

  test("it shows a confirmation modal when a draft is created (not creating doc as user)", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    // Reset the localStorage item
    window.localStorage.removeItem(DRAFT_CREATED_LOCAL_STORAGE_KEY);

    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT, "Foo");
    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    await click(CREATE_BUTTON);

    await waitFor(DRAFT_CREATED_MODAL);

    assert.dom(DRAFT_CREATED_MODAL).exists();
  });

  test("it shows an errors if the title or product/area is not set", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    assert.dom(TITLE_ERROR).doesNotExist();
    assert.dom(PRODUCT_ERROR).doesNotExist();

    await click(CREATE_BUTTON);

    assert.dom(TITLE_ERROR).exists();
    assert.dom(PRODUCT_ERROR).exists();

    await click(TITLE_INPUT);
    await fillIn(TITLE_INPUT, "Foo");

    // Trigger a keydown event to start validation
    await triggerKeyEvent(TITLE_INPUT, "keydown", "Escape");

    assert.dom(TITLE_ERROR).doesNotExist();

    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    await waitUntil(() => !find(PRODUCT_ERROR));

    assert.dom(PRODUCT_ERROR).doesNotExist();

    await fillIn(TITLE_INPUT, "");

    // Trigger a keydown event to start validation
    await triggerKeyEvent(TITLE_INPUT, "keydown", "Escape");

    assert.dom(TITLE_ERROR).exists();
  });

  test("the button changes color when the form is valid", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    assert.dom(SECONDARY_CREATE_BUTTON).exists();
    assert.dom(PRIMARY_CREATE_BUTTON).doesNotExist();

    await fillIn(TITLE_INPUT, "Foo");
    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    assert.dom(SECONDARY_CREATE_BUTTON).doesNotExist();
    assert.dom(PRIMARY_CREATE_BUTTON).exists();
  });

  test("it shows a message if the summary is more than 200 characters", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    assert.dom("[data-test-summary-length-warning]").doesNotExist();

    await fillIn(SUMMARY_INPUT, "A".repeat(201));

    // Trigger a keydown event to start validation
    await triggerKeyEvent(TITLE_INPUT, "keydown", "A");

    assert.dom("[data-test-summary-warning]").exists();
  });
});
