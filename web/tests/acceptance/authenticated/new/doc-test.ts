import { click, fillIn, visit, waitFor } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { Response } from "miragejs";
import RouterService from "@ember/routing/router-service";
import window from "ember-window-mock";
import { DRAFT_CREATED_LOCAL_STORAGE_KEY } from "hermes/components/modals/draft-created";

const DOC_FORM_SELECTOR = "[data-test-new-doc-form]";
const PRODUCT_SELECT_SELECTOR = `${DOC_FORM_SELECTOR} [data-test-product-select]`;
const PRODUCT_SELECT_TOGGLE_SELECTOR = `${PRODUCT_SELECT_SELECTOR} [data-test-x-dropdown-list-toggle-action]`;
const CREATE_BUTTON_SELECTOR = `${DOC_FORM_SELECTOR} [data-test-create-button]`;
const TITLE_INPUT_SELECTOR = `${DOC_FORM_SELECTOR} [data-test-title-input]`;
const SUMMARY_INPUT_SELECTOR = `${DOC_FORM_SELECTOR} [data-test-summary-input]`;
const PRODUCT_SELECT_LIST_ITEM_SELECTOR = `${PRODUCT_SELECT_SELECTOR} [data-test-x-dropdown-list-item]`;
const FIRST_PRODUCT_SELECT_LIST_ITEM_BUTTON_SELECTOR = `${PRODUCT_SELECT_LIST_ITEM_SELECTOR}:first-child button`;
const CREATING_NEW_DOC_SELECTOR = "[data-test-creating-new-doc]";
const FLASH_NOTIFICATION_SELECTOR = "[data-test-flash-notification]";
const DRAFT_CREATED_MODAL_SELECTOR = "[data-test-draft-created-modal]";

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

    const thumbnailBadgeSelector = "[data-test-doc-thumbnail-product-badge]";

    assert.dom(PRODUCT_SELECT_TOGGLE_SELECTOR).exists();
    assert
      .dom(`${PRODUCT_SELECT_TOGGLE_SELECTOR} span`)
      .hasText("Select a product/area");
    assert
      .dom(`${PRODUCT_SELECT_TOGGLE_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "folder");

    assert
      .dom(thumbnailBadgeSelector)
      .doesNotExist("badge not shown unless a product shortname exists");

    await click(PRODUCT_SELECT_TOGGLE_SELECTOR);

    const lastItemSelector = `${PRODUCT_SELECT_LIST_ITEM_SELECTOR}:last-child`;

    assert.dom(PRODUCT_SELECT_LIST_ITEM_SELECTOR).exists({ count: 5 });
    assert.dom(lastItemSelector).hasText("Terraform TF");
    assert
      .dom(lastItemSelector + " .flight-icon")
      .hasAttribute("data-test-icon", "terraform");

    await click(lastItemSelector + " button");

    assert.dom(PRODUCT_SELECT_TOGGLE_SELECTOR).hasText("Terraform TF");
    assert
      .dom(PRODUCT_SELECT_TOGGLE_SELECTOR + " .flight-icon")
      .hasAttribute("data-test-icon", "terraform");
    assert.dom(thumbnailBadgeSelector).exists();
  });

  test("the create button is disabled until the form requirements are met", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    assert.dom(CREATE_BUTTON_SELECTOR).isDisabled();

    await fillIn(TITLE_INPUT_SELECTOR, "Foo");

    assert.dom(CREATE_BUTTON_SELECTOR).isDisabled();

    await click(PRODUCT_SELECT_TOGGLE_SELECTOR);
    await click(FIRST_PRODUCT_SELECT_LIST_ITEM_BUTTON_SELECTOR);

    assert.dom(CREATE_BUTTON_SELECTOR).isNotDisabled();

    await fillIn(TITLE_INPUT_SELECTOR, "");

    assert.dom(CREATE_BUTTON_SELECTOR).isDisabled();
  });

  test("it shows a loading screen while the doc is being created", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT_SELECTOR, "Foo");
    await click(PRODUCT_SELECT_TOGGLE_SELECTOR);
    await click(FIRST_PRODUCT_SELECT_LIST_ITEM_BUTTON_SELECTOR);

    const clickPromise = click(CREATE_BUTTON_SELECTOR);

    await waitFor(CREATING_NEW_DOC_SELECTOR);

    assert.dom(CREATING_NEW_DOC_SELECTOR).exists();

    await clickPromise;
  });

  test("it shows an error screen if the doc creation fails", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    this.server.post("/drafts", () => {
      return new Response(500);
    });

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT_SELECTOR, "Foo");
    await click(PRODUCT_SELECT_TOGGLE_SELECTOR);
    await click(FIRST_PRODUCT_SELECT_LIST_ITEM_BUTTON_SELECTOR);

    const clickPromise = click(CREATE_BUTTON_SELECTOR);

    await waitFor(FLASH_NOTIFICATION_SELECTOR);

    assert
      .dom(FLASH_NOTIFICATION_SELECTOR)
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

    await fillIn(TITLE_INPUT_SELECTOR, "Foo");

    await fillIn(SUMMARY_INPUT_SELECTOR, "Bar");

    await click(PRODUCT_SELECT_TOGGLE_SELECTOR);
    await click(FIRST_PRODUCT_SELECT_LIST_ITEM_BUTTON_SELECTOR);

    await click(CREATE_BUTTON_SELECTOR);

    const routerService = this.owner.lookup("service:router") as RouterService;

    assert.equal(routerService.currentRouteName, "authenticated.document");
    assert.equal(routerService.currentURL, "/document/1?draft=true");

    assert.dom("[data-test-document-title]").includesText("Foo");
    assert.dom("[data-test-document-summary]").includesText("Bar");
    assert.dom("[data-test-badge-dropdown-list]").includesText("Terraform");
  });

  test("it shows a confirmation modal when a draft is created", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    // Reset the localStorage item
    window.localStorage.removeItem(DRAFT_CREATED_LOCAL_STORAGE_KEY);

    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT_SELECTOR, "Foo");
    await click(PRODUCT_SELECT_TOGGLE_SELECTOR);
    await click(FIRST_PRODUCT_SELECT_LIST_ITEM_BUTTON_SELECTOR);

    await click(CREATE_BUTTON_SELECTOR);

    await waitFor(DRAFT_CREATED_MODAL_SELECTOR);

    assert.dom(DRAFT_CREATED_MODAL_SELECTOR).exists();
  });
});
