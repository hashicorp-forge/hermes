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

// Selectors
const DOC_FORM = "[data-test-new-doc-form]";
const PRODUCT_SELECT = `${DOC_FORM} [data-test-product-select]`;
const PRODUCT_SELECT_TOGGLE = `${PRODUCT_SELECT} [data-test-x-dropdown-list-toggle-select]`;
const CREATE_BUTTON = `${DOC_FORM} [data-test-create-button]`;
const TITLE_INPUT = `${DOC_FORM} [data-test-title-input]`;
const SUMMARY_INPUT = `${DOC_FORM} [data-test-summary-input]`;
const PRODUCT_SELECT_ITEM = `${PRODUCT_SELECT} [data-test-x-dropdown-list-item]`;
const FIRST_PRODUCT_SELECT_ITEM_BUTTON = `${PRODUCT_SELECT_ITEM}:first-child button`;
const CREATING_NEW_DOC = "[data-test-creating-new-doc]";
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

    const thumbnailBadgeSelector = "[data-test-doc-thumbnail-product-badge]";

    assert.dom(PRODUCT_SELECT_TOGGLE).exists();
    assert
      .dom(`${PRODUCT_SELECT_TOGGLE} span`)
      .hasText("Select a product/area");
    assert
      .dom(`${PRODUCT_SELECT_TOGGLE} .flight-icon`)
      .hasAttribute("data-test-icon", "folder");

    assert
      .dom(thumbnailBadgeSelector)
      .doesNotExist("badge not shown unless a product shortname exists");

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
    assert.dom(thumbnailBadgeSelector).exists();
  });

  test("the create button is disabled until the form requirements are met", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    assert.dom(CREATE_BUTTON).isDisabled();

    await fillIn(TITLE_INPUT, "Foo");

    assert.dom(CREATE_BUTTON).isDisabled();

    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    assert.dom(CREATE_BUTTON).isNotDisabled();

    await fillIn(TITLE_INPUT, "");

    assert.dom(CREATE_BUTTON).isDisabled();
  });

  test("it shows a loading screen while the doc is being created", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
    this.server.createList("product", 1);

    await visit("/new/doc?docType=RFC");

    await fillIn(TITLE_INPUT, "Foo");
    await click(PRODUCT_SELECT_TOGGLE);
    await click(FIRST_PRODUCT_SELECT_ITEM_BUTTON);

    const clickPromise = click(CREATE_BUTTON);

    await waitFor(CREATING_NEW_DOC);

    assert.dom(CREATING_NEW_DOC).exists();

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
    assert.dom("[data-test-badge-dropdown-list]").includesText("Terraform");
  });

  test("it shows a confirmation modal when a draft is created", async function (this: AuthenticatedNewDocRouteTestContext, assert) {
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
});
