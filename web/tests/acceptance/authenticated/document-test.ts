import {
  click,
  currentURL,
  fillIn,
  find,
  findAll,
  triggerEvent,
  triggerKeyEvent,
  visit,
  waitFor,
} from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import {
  DraftVisibility,
  DraftVisibilityDescription,
  DraftVisibilityIcon,
} from "hermes/components/document/sidebar";
import { capitalize } from "@ember/string";
import window from "ember-window-mock";
import {
  TEST_USER_2_EMAIL,
  TEST_USER_3_EMAIL,
  TEST_USER_EMAIL,
  TEST_SHORT_LINK_BASE_URL,
  TEST_USER_NAME,
  TEST_USER_2_NAME,
} from "hermes/mirage/utils";
import { Response } from "miragejs";

const ADD_RELATED_RESOURCE_BUTTON_SELECTOR =
  "[data-test-section-header-button-for='Related resources']";
const ADD_RELATED_DOCUMENT_OPTION_SELECTOR = ".related-document-option";
const ADD_RELATED_RESOURCE_MODAL_SELECTOR =
  "[data-test-add-related-resource-modal]";
const FLASH_MESSAGE_SELECTOR = "[data-test-flash-notification]";
const TOOLTIP_SELECTOR = ".hermes-tooltip";
const DRAFT_VISIBILITY_DROPDOWN_SELECTOR =
  "[data-test-draft-visibility-dropdown]";
const DRAFT_VISIBILITY_TOGGLE_SELECTOR = "[data-test-draft-visibility-toggle]";
const DRAFT_VISIBILITY_READ_ONLY = "[data-test-draft-visibility-read-only]";
const COPY_URL_BUTTON_SELECTOR = "[data-test-sidebar-copy-url-button]";
const DRAFT_VISIBILITY_OPTION_SELECTOR = "[data-test-draft-visibility-option]";
const SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR = `${DRAFT_VISIBILITY_DROPDOWN_SELECTOR} li:nth-child(2)`;
const APPROVE_BUTTON = "[data-test-approve-button]";
const SIDEBAR_FOOTER_SECONDARY_DROPDOWN_BUTTON =
  "[data-test-sidebar-footer-secondary-dropdown-button]";
const SIDEBAR_FOOTER_OVERFLOW_MENU = "[data-test-sidebar-footer-overflow-menu]";
const SIDEBAR_FOOTER_OVERFLOW_ITEM = `${SIDEBAR_FOOTER_OVERFLOW_MENU} button`;
const REJECT_FRD_BUTTON = "[data-test-reject-frd-button]";
const SIDEBAR_FOOTER_PRIMARY_BUTTON_READ_ONLY =
  "[data-test-sidebar-footer-primary-button-read-only]";
("[data-test-sidebar-footer-secondary-button]");
const TITLE_SELECTOR = "[data-test-document-title]";
const SUMMARY_SELECTOR = "[data-test-document-summary]";
const CONTRIBUTORS_SELECTOR = "[data-test-document-contributors]";
const APPROVERS_SELECTOR = "[data-test-document-approvers]";
const APPROVED_BADGE_SELECTOR = "[data-test-person-badge-type='approved']";
const PRODUCT_SELECT_SELECTOR = "[data-test-product-select]";
const PRODUCT_SELECT_PRODUCT_NAME = "[data-test-product-value]";
const POPOVER = "[data-test-x-dropdown-list-content]";
const PRODUCT_SELECT_DROPDOWN_ITEM = `${POPOVER} [data-test-product-select-item]`;
const TOGGLE_SELECT = "[data-test-x-dropdown-list-toggle-select]";

/**
 * Transfer ownership
 */
const TRANSFER_OWNERSHIP_BUTTON =
  "[data-test-transfer-document-ownership-button]";
const TRANSFER_OWNERSHIP_MODAL = "[data-test-transfer-ownership-modal]";
const OWNERSHIP_TRANSFERRED_MODAL = "[data-test-ownership-transferred-modal]";
const TRANSFERRING_DOC = "[data-test-transferring-doc]";
const SELECT_NEW_OWNER_LABEL = "[data-test-select-new-owner-label]";
const MODAL_PEOPLE_SELECT = "dialog [data-test-people-select]";
const PEOPLE_SELECT_INPUT = ".ember-power-select-trigger-multiple-input";
const PEOPLE_SELECT_OPTION =
  ".ember-power-select-option:not(.ember-power-select-option--no-matches-message)";

const DISABLED_FOOTER_H5 = "[data-test-disabled-footer-h5]";
const OWNER_LINK = "[data-test-owner-link]";

const EDITABLE_FIELD_READ_VALUE = "[data-test-editable-field-read-value]";
const EDITABLE_PRODUCT_AREA_SELECTOR =
  "[data-test-document-product-area-editable]";
const READ_ONLY_PRODUCT_AREA_SELECTOR =
  "[data-test-document-product-area-read-only]";
const SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR =
  "[data-test-sidebar-publish-for-review-button";
const PUBLISH_FOR_REVIEW_MODAL_SELECTOR =
  "[data-test-publish-for-review-modal]";
const DELETE_BUTTON = "[data-test-delete-draft-button]";
const DELETE_MODAL = "[data-test-delete-draft-modal]";
const DOCUMENT_MODAL_PRIMARY_BUTTON =
  "[data-test-document-modal-primary-button]";
const PUBLISHING_FOR_REVIEW_MESSAGE_SELECTOR =
  "[data-test-publishing-for-review-message]";
const DOC_PUBLISHED_MODAL_SELECTOR = "[data-test-doc-published-modal]";
const SHARE_DOCUMENT_URL_INPUT_SELECTOR =
  "[data-test-share-document-url-input]";
const CONTINUE_TO_DOCUMENT_BUTTON_SELECTOR =
  "[data-test-continue-to-document-button]";
const DOC_PUBLISHED_COPY_URL_BUTTON_SELECTOR =
  "[data-test-doc-published-copy-url-button]";
const PROJECTS_ERROR_BUTTON = "[data-test-document-projects-error-button]";
const DOC_STATUS = "[data-test-doc-status]";
const DOC_STATUS_TOGGLE = "[data-test-doc-status-toggle]";
const DOC_STATUS_DROPDOWN = "[data-test-doc-status-dropdown]";

const CUSTOM_STRING_FIELD_SELECTOR = "[data-test-custom-field-type='string']";
const CUSTOM_PEOPLE_FIELD_SELECTOR = "[data-test-custom-field-type='people']";
const EDITABLE_FIELD_SAVE_BUTTON_SELECTOR =
  ".editable-field [data-test-save-button]";
const PEOPLE_SELECT_REMOVE_BUTTON_SELECTOR =
  ".ember-power-select-multiple-remove-btn";
const TYPE_TO_CONFIRM_INPUT = "[data-test-type-to-confirm-input]";
const PROJECT_LINK = "[data-test-project-link]";
const ADD_TO_PROJECT_BUTTON =
  "[data-test-section-header-button-for='Projects']";
const ADD_TO_PROJECT_MODAL = "[data-test-add-to-or-create-project-modal]";
const PROJECT_OPTION = "[data-test-project-option]";

const PROJECT_DOCUMENT =
  "[data-test-document-list] [data-test-resource-list-item]";
const START_NEW_PROJECT_BUTTON = "[data-test-start-new-project-button]";

const PROJECT_FORM = "[data-test-project-form]";
const PROJECT_TITLE_INPUT = `${PROJECT_FORM} [data-test-title]`;
const CREATE_PROJECT_BUTTON = `${PROJECT_FORM} [data-test-submit]`;
const CREATING_PROJECT_MESSAGE = "[data-test-creating-project-message]";
const PROJECT_DOCUMENT_LINK = "[data-test-document-link]";
const OVERFLOW_MENU_BUTTON = "[data-test-overflow-menu-button]";
const REMOVE_FROM_PROJECT_BUTTON =
  "[data-test-overflow-menu-action='remove-from-project']";
const DOCUMENT_PROJECT = "[data-test-document-project]";

const MODAL_ERROR = "[data-test-modal-error]";

const ERROR_MESSAGE_TEXT = "Internal Server Error";

const assertEditingIsDisabled = (assert: Assert) => {
  assert.dom(TITLE_SELECTOR).doesNotHaveAttribute("data-test-editable");
  assert.dom(SUMMARY_SELECTOR).doesNotHaveAttribute("data-test-editable");
  assert.dom(CONTRIBUTORS_SELECTOR).doesNotHaveAttribute("data-test-editable");
  assert.dom(APPROVERS_SELECTOR).doesNotHaveAttribute("data-test-editable");

  assert.dom(EDITABLE_PRODUCT_AREA_SELECTOR).doesNotExist();
  assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).doesNotExist();
  assert.dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR).doesNotExist();

  assert.dom(READ_ONLY_PRODUCT_AREA_SELECTOR).exists();
};

interface AuthenticatedDocumentRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/document", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("it redirects to the dashboard by default if the document doesn't exist", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    await visit("/document/1");
    assert.equal(currentURL(), "/dashboard");
  });

  test("it redirects to the previous page if the document doesn't exist", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    await visit("/documents");
    assert.equal(currentURL(), "/documents");

    await visit("/document/1");
    assert.equal(currentURL(), "/documents");
  });

  test("the page title is correct (published doc)", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", { objectID: 1, title: "Test Document" });
    await visit("/document/1");
    assert.equal(getPageTitle(), "Test Document | Hermes");
  });

  test("the footer is not shown", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", { objectID: 1, title: "Test Document" });
    await visit("/document/1");
    assert.dom(".footer").doesNotExist();
  });

  test("the page title is correct (draft)", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
    });
    await visit("/document/1?draft=true");
    assert.equal(getPageTitle(), "Test Document | Hermes");
  });

  test("the status label of a draft is not interactive", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      status: "WIP",
    });
    await visit("/document/1?draft=true");

    assert.dom(DOC_STATUS_TOGGLE).doesNotExist();
    assert.dom(DOC_STATUS).hasText("WIP", "label exists but isn't clickable");
  });

  test("the owner is clickable", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
    });

    await visit("/document/1");

    assert
      .dom(OWNER_LINK)
      .hasAttribute(
        "href",
        `/documents?owners=%5B%22${encodeURIComponent(TEST_USER_EMAIL)}%22%5D`,
      );
  });

  test("you can change a draft's product area", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    const docID = "test-doc-0";

    this.server.createList("product", 3);

    const initialProduct = this.server.schema.products.find(2).attrs;

    const initialProductName = initialProduct.name;

    this.server.create("document", {
      objectID: docID,
      product: initialProductName,
    });

    await visit(`/document/${docID}?draft=true`);

    assert
      .dom(PRODUCT_SELECT_SELECTOR)
      .exists("drafts show a product select element");

    assert
      .dom(PRODUCT_SELECT_PRODUCT_NAME)
      .hasText(initialProductName, "The document product is selected");

    await click(TOGGLE_SELECT);
    const options = findAll(PRODUCT_SELECT_DROPDOWN_ITEM);

    const expectedProducts = ["TP0", "TP1", "TP2"];
    options.forEach((option: Element, index: number) => {
      assert.equal(
        option
          .querySelector("[data-test-product-select-item-abbreviation]")
          ?.textContent?.trim(),
        expectedProducts[index],
        "the product list item is correct",
      );
    });

    await click(PRODUCT_SELECT_DROPDOWN_ITEM);

    assert
      .dom(PRODUCT_SELECT_SELECTOR)
      .containsText(
        "Test Product 0",
        "The document product is updated to the selected product",
      );

    const doc = this.server.schema.document.findBy({
      objectID: docID,
    });

    assert.equal(
      doc.attrs.product,
      "Test Product 0",
      "the product is updated in the back end",
    );
  });

  test("a published doc's productArea can't be changed ", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      status: "In-Review",
      product: "Test Product 0",
    });

    await visit("/document/1");

    assert
      .dom("[data-test-product-select]")
      .doesNotExist("published docs don't show a product select element");
  });

  test("the shortLinkURL is loaded by the config service", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 500,
      title: "Test Document",
      status: "In-Review",
    });

    await visit("/document/500");
    const shortLinkURL = find(COPY_URL_BUTTON_SELECTOR)?.getAttribute(
      "data-test-url",
    );

    assert.true(shortLinkURL?.startsWith(TEST_SHORT_LINK_BASE_URL));
  });

  test("a flash message displays when a related resource fails to save", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.put("/documents/:document_id/related-resources", {}, 500);

    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      product: "Test Product 0",
      status: "In review",
    });

    await visit("/document/1");

    await click(ADD_RELATED_RESOURCE_BUTTON_SELECTOR);

    await waitFor(ADD_RELATED_DOCUMENT_OPTION_SELECTOR);

    await click(ADD_RELATED_DOCUMENT_OPTION_SELECTOR);

    await waitFor(FLASH_MESSAGE_SELECTOR);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText("Unable to save resource");
  });

  test("a draft can toggle its `isShareable` property", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      product: "Test Product 0",
      status: "WIP",
    });

    await visit("/document/1?draft=true");

    assert.dom(COPY_URL_BUTTON_SELECTOR).doesNotExist("not yet shareable");
    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).exists();
    assert
      .dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR)
      .hasAttribute("data-test-icon", DraftVisibilityIcon.Restricted);

    assert.dom(TOOLTIP_SELECTOR).doesNotExist();

    await triggerEvent(DRAFT_VISIBILITY_TOGGLE_SELECTOR, "mouseenter");

    assert
      .dom(TOOLTIP_SELECTOR)
      .hasText(capitalize(DraftVisibility.Restricted));

    await click(DRAFT_VISIBILITY_TOGGLE_SELECTOR);

    assert.dom(DRAFT_VISIBILITY_DROPDOWN_SELECTOR).exists("dropdown is open");

    assert.dom(DRAFT_VISIBILITY_OPTION_SELECTOR).exists({ count: 2 });

    assert
      .dom(DRAFT_VISIBILITY_OPTION_SELECTOR + " h4")
      .containsText(capitalize(DraftVisibility.Restricted));

    assert
      .dom(DRAFT_VISIBILITY_OPTION_SELECTOR + " p")
      .containsText(DraftVisibilityDescription.Restricted);

    assert
      .dom(DRAFT_VISIBILITY_OPTION_SELECTOR)
      .hasAttribute("data-test-is-checked")
      .hasAttribute("data-test-value", DraftVisibility.Restricted);

    // assert that the second option has the correct text

    assert
      .dom(`${SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR} h4`)
      .containsText(capitalize(DraftVisibility.Shareable));

    assert
      .dom(`${SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR} p`)
      .containsText(DraftVisibilityDescription.Shareable);

    assert
      .dom(
        `${SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR} ${DRAFT_VISIBILITY_OPTION_SELECTOR}`,
      )
      .doesNotHaveAttribute("data-test-is-checked")
      .hasAttribute("data-test-value", DraftVisibility.Shareable);

    const clickPromise = click(
      `${DRAFT_VISIBILITY_DROPDOWN_SELECTOR} li:nth-child(2) ${DRAFT_VISIBILITY_OPTION_SELECTOR}`,
    );

    await waitFor(`${COPY_URL_BUTTON_SELECTOR}[data-test-icon="running"]`);

    assert
      .dom(`${COPY_URL_BUTTON_SELECTOR}[data-test-icon="running"]`)
      .exists('a "running" state is shown');
    assert.dom(TOOLTIP_SELECTOR).hasText("Creating link...");

    await waitFor(`${COPY_URL_BUTTON_SELECTOR}[data-test-icon="smile"]`);

    assert
      .dom(`${COPY_URL_BUTTON_SELECTOR}[data-test-icon="smile"]`)
      .exists('a "smile" state is shown');
    assert.dom(TOOLTIP_SELECTOR).hasText("Link created!");

    await clickPromise;

    await waitFor(`${COPY_URL_BUTTON_SELECTOR}[data-test-icon="link"]`);

    assert
      .dom(DRAFT_VISIBILITY_DROPDOWN_SELECTOR)
      .doesNotExist("dropdown is closed");

    assert
      .dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR)
      .hasAttribute("data-test-icon", DraftVisibilityIcon.Shareable);

    assert.dom(TOOLTIP_SELECTOR).doesNotExist("the tooltip is force-closed");

    await triggerEvent(DRAFT_VISIBILITY_TOGGLE_SELECTOR, "mouseenter");

    assert.dom(TOOLTIP_SELECTOR).hasText(capitalize(DraftVisibility.Shareable));

    assert
      .dom(COPY_URL_BUTTON_SELECTOR)
      .exists("now shareable")
      .hasAttribute(
        "data-test-url",
        window.location.href,
        "the URL to be copied is correct",
      );

    await click(DRAFT_VISIBILITY_TOGGLE_SELECTOR);

    assert
      .dom(DRAFT_VISIBILITY_OPTION_SELECTOR)
      .doesNotHaveAttribute("data-test-is-checked");

    assert
      .dom(
        `${SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR} ${DRAFT_VISIBILITY_OPTION_SELECTOR}`,
      )
      .hasAttribute("data-test-is-checked");

    // Turn it back to restricted
    await click(DRAFT_VISIBILITY_OPTION_SELECTOR);

    assert
      .dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR)
      .hasAttribute("data-test-icon", DraftVisibilityIcon.Restricted);

    assert
      .dom(COPY_URL_BUTTON_SELECTOR)
      .doesNotExist("copyURLButton is removed");
  });

  test("owners can edit a draft's document metadata", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
    });

    await visit("/document/1?draft=true");

    assert.dom(TITLE_SELECTOR).hasAttribute("data-test-editable");
    assert.dom(SUMMARY_SELECTOR).hasAttribute("data-test-editable");
    assert.dom(CONTRIBUTORS_SELECTOR).hasAttribute("data-test-editable");
    assert.dom(APPROVERS_SELECTOR).hasAttribute("data-test-editable");

    assert.dom(EDITABLE_PRODUCT_AREA_SELECTOR).exists();
    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).exists();
    assert.dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR).exists();

    assert.dom(READ_ONLY_PRODUCT_AREA_SELECTOR).doesNotExist();
  });

  test("owners can edit everything but the product area of a published doc", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
    });

    await visit("/document/1");

    assert.dom(TITLE_SELECTOR).hasAttribute("data-test-editable");
    assert.dom(SUMMARY_SELECTOR).hasAttribute("data-test-editable");
    assert.dom(CONTRIBUTORS_SELECTOR).hasAttribute("data-test-editable");
    assert.dom(APPROVERS_SELECTOR).hasAttribute("data-test-editable");

    assert.dom(EDITABLE_PRODUCT_AREA_SELECTOR).doesNotExist();
    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).doesNotExist();

    assert.dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR).exists();

    assert.dom(READ_ONLY_PRODUCT_AREA_SELECTOR).exists();
  });

  test("collaborators cannot edit the metadata of a draft", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      owners: [TEST_USER_2_EMAIL],
      collaborators: [TEST_USER_EMAIL],
    });

    await visit("/document/1?draft=true");

    assertEditingIsDisabled(assert);
  });

  test("collaborators cannot edit the metadata of published docs", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
      owners: [TEST_USER_2_EMAIL],
      collaborators: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    assertEditingIsDisabled(assert);
  });

  test("approvers cannot edit the metadata of a published doc", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
      owners: [TEST_USER_2_EMAIL],
      approvers: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    assertEditingIsDisabled(assert);
  });

  test("you can delete a draft", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
    });

    await visit("/document/1?draft=true");

    await triggerEvent(DELETE_BUTTON, "mouseenter");

    assert.dom(TOOLTIP_SELECTOR).hasText("Delete...");

    await click(DELETE_BUTTON);

    assert.dom(DELETE_MODAL).exists("the user is shown a confirmation screen");

    assert.dom(DOCUMENT_MODAL_PRIMARY_BUTTON).hasText("Yes, delete");

    await click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    assert.dom(DELETE_MODAL).doesNotExist("the modal is dismissed");

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText("Document draft deleted");

    assert.equal(
      currentURL(),
      "/my/documents",
      'the user is redirected to the "my documents" page',
    );
  });

  test("an approver can remove themselves from the approver role", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      status: "In review",
      isDraft: false,
      owners: [TEST_USER_2_EMAIL],
      approvers: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    const approversList = find(APPROVERS_SELECTOR);

    assert.dom(approversList).containsText("Me");

    await click(SIDEBAR_FOOTER_SECONDARY_DROPDOWN_BUTTON);

    assert.dom(SIDEBAR_FOOTER_OVERFLOW_MENU).exists();
    assert.dom(SIDEBAR_FOOTER_OVERFLOW_ITEM).exists({ count: 1 });

    assert.dom(SIDEBAR_FOOTER_OVERFLOW_ITEM).hasText("Leave approver role");

    await click(SIDEBAR_FOOTER_OVERFLOW_ITEM);

    assert.dom(SIDEBAR_FOOTER_OVERFLOW_MENU).doesNotExist();

    assert
      .dom(FLASH_MESSAGE_SELECTOR)
      .hasAttribute("data-test-flash-notification-type", "success")
      .containsText("You've left the approver role");

    assert.dom(approversList).doesNotContainText(TEST_USER_NAME);

    const doc = this.server.schema.document.first();

    assert.false(doc.attrs.approvers.includes(TEST_USER_EMAIL));
  });

  test("approvers can approve a document", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
      owners: [TEST_USER_2_EMAIL],
      approvers: [TEST_USER_EMAIL],
      approvedBy: [],
    });

    await visit("/document/1");

    assert.dom(DOC_STATUS).hasText("In review");

    await click(APPROVE_BUTTON);

    assert.dom(APPROVE_BUTTON).doesNotExist("footer controls are removed");
    assert.dom(SIDEBAR_FOOTER_PRIMARY_BUTTON_READ_ONLY).hasText("Approved");

    assert
      .dom(FLASH_MESSAGE_SELECTOR)
      .hasAttribute("data-test-flash-notification-type", "success")
      .containsText("Document approved");

    const doc = this.server.schema.document.first();
    const { approvedBy } = doc.attrs;

    assert.true(approvedBy?.includes(TEST_USER_EMAIL));
  });

  test("approvers can reject an FRD", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
      docType: "FRD",
      owners: [TEST_USER_2_EMAIL],
      approvers: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    await triggerEvent(REJECT_FRD_BUTTON, "mouseenter");

    assert.dom(TOOLTIP_SELECTOR).hasText("Reject");

    await click(REJECT_FRD_BUTTON);

    assert.dom(REJECT_FRD_BUTTON).doesNotExist("footer controls are removed");

    assert.dom(SIDEBAR_FOOTER_PRIMARY_BUTTON_READ_ONLY).hasText("Rejected");

    assert
      .dom(FLASH_MESSAGE_SELECTOR)
      .exists({ count: 1 })
      .hasAttribute("data-test-flash-notification-type", "success")
      .containsText("rejected");

    const doc = this.server.schema.document.first();
    const { changesRequestedBy } = doc.attrs;

    assert.true(changesRequestedBy?.includes(TEST_USER_EMAIL));
  });

  test("group approvers can approve a document", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.options("/approvals/:document_id", () => {
      return new Response(200, { allowed: "POST" }, {});
    });

    this.server.create("document", {
      id: 1,
      objectID: 1,
      isDraft: false,
      status: "In-review",
      approvers: [],
      approvedBy: [],
    });

    await visit("/document/1");

    assert
      .dom(OVERFLOW_MENU_BUTTON)
      .doesNotExist(
        'the "remove me" function is not available to group approvers',
      );

    await click(APPROVE_BUTTON);

    assert.dom(SIDEBAR_FOOTER_PRIMARY_BUTTON_READ_ONLY).hasText("Approved");

    assert.dom(APPROVERS_SELECTOR).containsText("Me");

    const doc = this.server.schema.document.find(1).attrs;

    const { approvers } = doc;

    assert.true(approvers.includes(TEST_USER_EMAIL));
  });

  test("non-owner viewers of shareable drafts cannot edit the metadata of a draft", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      owners: [TEST_USER_2_EMAIL],
      isShareable: true,
    });

    await visit("/document/1?draft=true");

    assertEditingIsDisabled(assert);

    assert
      .dom(DRAFT_VISIBILITY_READ_ONLY)
      .exists("draft visibility is shown in a read-only format");
  });

  test("non-owners can't edit the status of a doc", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In-Review",
      owners: [TEST_USER_2_EMAIL],
    });

    await visit("/document/1");

    assert.dom(DOC_STATUS_TOGGLE).doesNotExist("the toggle is not shown");
    assert
      .dom(DOC_STATUS)
      .hasText("In review", "the status is shown but not as a toggle");
  });

  test("non-owners don't see the transfer-ownership button", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In-Review",
      owners: [TEST_USER_2_EMAIL],
    });

    await visit("/document/1");

    assert.dom(TRANSFER_OWNERSHIP_BUTTON).doesNotExist();
  });

  test("doc owners can publish their docs for review", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("google/person", {
      emailAddresses: [{ value: TEST_USER_2_EMAIL }],
      names: [{ displayName: TEST_USER_2_NAME }],
    });

    this.server.create("document", {
      objectID: 1,
      docType: "PRD",
    });

    await visit("/document/1?draft=true");

    assert.dom(DOC_STATUS).hasText("WIP");

    await click(SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR);

    assert.dom(PUBLISH_FOR_REVIEW_MODAL_SELECTOR).exists();

    // Add an approver
    await click(MODAL_PEOPLE_SELECT);

    await fillIn(
      ".ember-power-select-trigger-multiple-input",
      TEST_USER_2_EMAIL,
    );

    await click(PEOPLE_SELECT_OPTION);

    let clickPromise = click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    await waitFor(PUBLISHING_FOR_REVIEW_MESSAGE_SELECTOR);
    assert.dom(PUBLISHING_FOR_REVIEW_MESSAGE_SELECTOR).exists();

    await clickPromise;

    await waitFor(DOC_PUBLISHED_MODAL_SELECTOR);
    assert.dom(DOC_PUBLISHED_MODAL_SELECTOR).exists();

    assert
      .dom(DOC_STATUS)
      .hasText("In review", "the status is updated when published");

    assert
      .dom(SHARE_DOCUMENT_URL_INPUT_SELECTOR)
      .exists()
      .hasValue(`${TEST_SHORT_LINK_BASE_URL}/prd/hcp-001`);

    assert.dom(DOC_PUBLISHED_COPY_URL_BUTTON_SELECTOR).hasText("Copy link");
    assert
      .dom(CONTINUE_TO_DOCUMENT_BUTTON_SELECTOR)
      .hasText("Continue to document")
      .hasAttribute("data-test-color", "tertiary");

    await click(CONTINUE_TO_DOCUMENT_BUTTON_SELECTOR);

    assert.dom(DOC_PUBLISHED_MODAL_SELECTOR).doesNotExist();

    assert.dom(APPROVERS_SELECTOR).containsText(TEST_USER_2_NAME);
  });

  test('the "document published" modal hides the share elements if the docNumber fails to load', async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      docType: "PRD",
      docNumber: "LAB-???",
    });

    await visit("/document/1?draft=true");

    await click(SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR);
    await click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    await waitFor(DOC_PUBLISHED_MODAL_SELECTOR);
    assert.dom(DOC_PUBLISHED_MODAL_SELECTOR).exists();

    assert.dom(SHARE_DOCUMENT_URL_INPUT_SELECTOR).doesNotExist();
    assert.dom(DOC_PUBLISHED_COPY_URL_BUTTON_SELECTOR).doesNotExist();

    assert
      .dom(CONTINUE_TO_DOCUMENT_BUTTON_SELECTOR)
      .hasAttribute(
        "data-test-color",
        "primary",
        "the Continue button becomes the primary button when the copy link is hidden",
      );
  });

  test("non-required values can be reset by saving an empty value", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      summary: "foo bar baz",
    });

    await visit("/document/1?draft=true");

    await click(`${SUMMARY_SELECTOR} button`);

    await fillIn(`${SUMMARY_SELECTOR} textarea`, "");

    await triggerKeyEvent(`${SUMMARY_SELECTOR} textarea`, "keydown", "Enter");

    assert.dom(SUMMARY_SELECTOR).hasText("Enter a summary");
  });

  test('"people" inputs receive focus on click', async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      customEditableFields: {
        Stakeholders: {
          displayName: "Stakeholders",
          type: "PEOPLE",
        },
      },
    });

    await visit("/document/1?draft=true");

    await click(`${CONTRIBUTORS_SELECTOR} .field-toggle`);

    assert.true(
      document.activeElement === find(`${CONTRIBUTORS_SELECTOR} input`),
    );

    await click(`${APPROVERS_SELECTOR} .field-toggle`);

    assert.true(document.activeElement === find(`${APPROVERS_SELECTOR} input`));
  });

  test('clicking the empty state of the related resources list opens the "add related resource" modal', async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
    });

    await visit("/document/1?draft=true");

    await click("[data-test-related-resources-list-empty-state]");
    await waitFor(ADD_RELATED_RESOURCE_MODAL_SELECTOR);

    assert.dom(ADD_RELATED_RESOURCE_MODAL_SELECTOR).exists();
  });

  test("the title attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    let title = "Test Document";
    let docNumber = "HCP-???";

    this.server.create("document", {
      objectID: 1,
      title,
      docNumber,
    });

    await visit("/document/1?draft=true");

    assert.dom(TITLE_SELECTOR).hasText(`${title} ${docNumber}`);

    await click(`${TITLE_SELECTOR} button`);

    assert
      .dom(`${TITLE_SELECTOR} textarea`)
      .hasValue(title, "docNumber not part of the textarea");

    title = "New Title";

    await fillIn(`${TITLE_SELECTOR} textarea`, title);

    await triggerKeyEvent(`${TITLE_SELECTOR} textarea`, "keydown", "Enter");

    assert.dom(TITLE_SELECTOR).hasText(`${title} ${docNumber}`);

    assert.equal(
      this.server.schema.document.first().attrs.title,
      title,
      "the title is updated in the back end",
    );
  });

  test("the summary attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      summary: "foo bar baz",
    });

    await visit("/document/1?draft=true");

    await click(`${SUMMARY_SELECTOR} button`);

    await fillIn(`${SUMMARY_SELECTOR} textarea`, "New Summary");

    await triggerKeyEvent(`${SUMMARY_SELECTOR} textarea`, "keydown", "Enter");

    assert.dom(SUMMARY_SELECTOR).hasText("New Summary");
  });

  test("the contributors attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      contributors: [TEST_USER_2_EMAIL],
    });

    await visit("/document/1?draft=true");

    await click(`${CONTRIBUTORS_SELECTOR} button`);

    // Delete the existing contributor and save
    await click(PEOPLE_SELECT_REMOVE_BUTTON_SELECTOR);
    await click(EDITABLE_FIELD_SAVE_BUTTON_SELECTOR);

    assert.dom(CONTRIBUTORS_SELECTOR).hasText("None");
  });

  test("the approvers attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      approvers: [TEST_USER_2_EMAIL],
    });

    await visit("/document/1?draft=true");

    await click(`${APPROVERS_SELECTOR} button`);

    // Delete the existing approver and save
    await click(PEOPLE_SELECT_REMOVE_BUTTON_SELECTOR);
    await click(EDITABLE_FIELD_SAVE_BUTTON_SELECTOR);

    assert.dom(APPROVERS_SELECTOR).hasText("None");
  });

  test("the product area attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("product", {
      name: "Foo",
    });

    this.server.create("product", {
      name: "Bar",
    });

    this.server.create("document", {
      objectID: 1,
      product: "Bar",
    });

    await visit("/document/1?draft=true");

    assert.dom(PRODUCT_SELECT_SELECTOR).containsText("Bar");

    await click(`${PRODUCT_SELECT_SELECTOR} button`);

    await click(PRODUCT_SELECT_DROPDOWN_ITEM);

    assert.dom(PRODUCT_SELECT_SELECTOR).containsText("Foo");

    // confirm with the back end

    assert.equal(
      this.server.schema.document.first().attrs.product,
      "Foo",
      "the product is updated in the back end",
    );
  });

  test("customEditableFields save (STRING)", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      customEditableFields: {
        foo: {
          displayName: "Foo",
          type: "STRING",
        },
      },
    });

    await visit("/document/1?draft=true");

    await click(`${CUSTOM_STRING_FIELD_SELECTOR} button`);

    await fillIn("textarea", "Bar");

    await click(EDITABLE_FIELD_SAVE_BUTTON_SELECTOR);

    assert.dom(CUSTOM_STRING_FIELD_SELECTOR).hasText("Bar");
  });

  test("customEditableFields save (PEOPLE)", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      customEditableFields: {
        foo: {
          displayName: "Foo",
          type: "PEOPLE",
        },
      },
      foo: [TEST_USER_2_EMAIL],
    });

    await visit("/document/1?draft=true");

    await click(`${CUSTOM_PEOPLE_FIELD_SELECTOR} button`);

    // Delete the existing contributor and save
    await click(PEOPLE_SELECT_REMOVE_BUTTON_SELECTOR);
    await click(EDITABLE_FIELD_SAVE_BUTTON_SELECTOR);

    assert.dom(CUSTOM_PEOPLE_FIELD_SELECTOR).hasText("None");
  });

  test(`you can move between statuses`, async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      status: "In-Review",
      approvers: [],
      approvedBy: [],
    });

    await visit("/document/1");

    assert.dom(DOC_STATUS).hasText("In review");

    await click(DOC_STATUS_TOGGLE);

    assert.dom(DOC_STATUS_DROPDOWN).exists();

    const inReview = `${DOC_STATUS_DROPDOWN} li:nth-child(1) button`;
    const approved = `${DOC_STATUS_DROPDOWN} li:nth-child(2) button`;
    const obsolete = `${DOC_STATUS_DROPDOWN} li:nth-child(3) button`;

    assert
      .dom(inReview)
      .hasText("In review")
      .hasAttribute("data-test-is-checked");

    assert
      .dom(approved)
      .hasText("Approved")
      .doesNotHaveAttribute("data-test-is-checked");

    assert
      .dom(obsolete)
      .hasText("Obsolete")
      .doesNotHaveAttribute("data-test-is-checked");

    await click(approved);

    assert.dom(DOC_STATUS).hasText("Approved");

    assert.equal(
      this.server.schema.document.first().attrs.status,
      "Approved",
      "the status is updated in the back end",
    );

    await click(DOC_STATUS_TOGGLE);

    assert.dom(inReview).doesNotHaveAttribute("data-test-is-checked");
    assert.dom(approved).hasAttribute("data-test-is-checked");
    assert.dom(obsolete).doesNotHaveAttribute("data-test-is-checked");

    await click(obsolete);

    assert.dom(DOC_STATUS).hasText("Obsolete");

    assert.equal(
      this.server.schema.document.first().attrs.status,
      "Obsolete",
      "the status is updated in the back end",
    );

    await click(DOC_STATUS_TOGGLE);

    assert.dom(inReview).doesNotHaveAttribute("data-test-is-checked");
    assert.dom(approved).doesNotHaveAttribute("data-test-is-checked");
    assert.dom(obsolete).hasAttribute("data-test-is-checked");

    await click(inReview);

    assert.dom(DOC_STATUS).hasText("In review");

    assert.equal(
      this.server.schema.document.first().attrs.status,
      "In-Review",
      "the status is updated in the back end",
    );
  });

  test("approvers who have approved a document are badged with a checkmark", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      approvers: [TEST_USER_2_EMAIL, TEST_USER_3_EMAIL],
      approvedBy: [TEST_USER_2_EMAIL],
    });

    await visit("/document/1");

    assert.dom(`${APPROVERS_SELECTOR} li`).exists({ count: 2 });

    assert
      .dom(`${APPROVERS_SELECTOR} li:nth-child(1) ${APPROVED_BADGE_SELECTOR}`)
      .exists("the first approver is badged with a check");

    assert
      .dom(`${APPROVERS_SELECTOR} li:nth-child(2) ${APPROVED_BADGE_SELECTOR}`)
      .doesNotExist("the second approver is not badged");
  });

  test("a locked doc can't be edited", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      locked: true,
    });

    await visit("/document/doc-0?draft=true");

    assert
      .dom(`${TITLE_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only title");
    assert
      .dom(`${SUMMARY_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only summary")
      .hasText("None", 'correctly does not say "enter a summary"');

    assert
      .dom(`${CONTRIBUTORS_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only contributors list");
    assert
      .dom(`${APPROVERS_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only approvers list");
    assert
      .dom(ADD_RELATED_DOCUMENT_OPTION_SELECTOR)
      .doesNotExist("no add related resource option");

    assert.dom(PRODUCT_SELECT_SELECTOR).doesNotExist("no product select");
    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).isDisabled();

    assert
      .dom(DISABLED_FOOTER_H5)
      .hasText("Document is locked", "shows the locked-doc message");
  });

  test("the doc is locked if it's not app-created", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      appCreated: false,
    });

    await visit("/document/doc-0?draft=true");

    assert
      .dom(`${TITLE_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only title");
    assert
      .dom(`${SUMMARY_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only summary")
      .hasText("None", 'correctly does not say "enter a summary"');

    assert
      .dom(`${CONTRIBUTORS_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only contributors list");

    assert
      .dom(`${APPROVERS_SELECTOR} ${EDITABLE_FIELD_READ_VALUE}`)
      .exists("read-only approvers list");

    assert
      .dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR)
      .hasAttribute("aria-disabled");

    assert.dom(ADD_TO_PROJECT_BUTTON).hasAttribute("aria-disabled");
    assert.dom(PRODUCT_SELECT_SELECTOR).doesNotExist("no product select");
    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).isDisabled();

    assert
      .dom(DISABLED_FOOTER_H5)
      .hasText("Read-only headers", "shows the locked-doc message");
  });

  test("it displays a list of projects the document is in", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      projects: [1, 2],
    });

    this.server.create("project", {
      id: 1,
      title: "Project 1",
    });

    this.server.create("project", {
      id: 2,
      title: "Project 2",
    });

    await visit("/document/1");

    assert.dom(PROJECT_LINK).exists({ count: 2 });

    const firstProjectLink = find(PROJECT_LINK);
    const secondProjectLink = findAll(PROJECT_LINK)[1];

    assert.dom(firstProjectLink).hasText("Project 1");
    assert.dom(firstProjectLink).hasAttribute("href", "/projects/1");

    assert.dom(secondProjectLink).hasText("Project 2");
    assert.dom(secondProjectLink).hasAttribute("href", "/projects/2");
  });

  test("you can't add a draft to a project", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document");

    await visit("/document/doc-0?draft=true");

    assert.dom(ADD_TO_PROJECT_BUTTON).hasAttribute("aria-disabled");
  });

  test("you can add a published doc to a project", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      isDraft: false,
      status: "In-review",
    });

    this.server.create("project", {
      id: 1,
    });

    // Remove the factory-created document
    this.server.schema.projects.first().update({
      hermesDocuments: [],
    });

    await visit("/document/doc-0");

    assert.dom(PROJECT_LINK).doesNotExist();

    await click(ADD_TO_PROJECT_BUTTON);

    assert.dom(ADD_TO_PROJECT_MODAL).exists();

    await click(PROJECT_OPTION);

    assert.dom(ADD_TO_PROJECT_MODAL).doesNotExist();

    assert.dom(PROJECT_LINK).exists().hasAttribute("href", "/projects/1");

    const project = this.server.schema.projects.first();
    const document = this.server.schema.document.first();

    assert.true(document.projects.includes(project.id));
  });

  test("you can create a new project to add the document to", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    const title = "Foo";
    const id = 500;

    this.server.create("document", {
      objectID: id,
      title,
      isDraft: false,
      status: "In-review",
    });

    this.server.create("related-hermes-document", {
      id,
      title,
    });

    await visit(`/document/${id}`);

    await click(ADD_TO_PROJECT_BUTTON);

    assert.dom(ADD_TO_PROJECT_MODAL).exists();

    await click(START_NEW_PROJECT_BUTTON);

    await fillIn(PROJECT_TITLE_INPUT, "New Project");

    const clickPromise = click(CREATE_PROJECT_BUTTON);

    // Confirm the "creating..." state
    await waitFor(CREATING_PROJECT_MESSAGE);

    await clickPromise;

    assert.equal(
      currentURL(),
      "/projects/1",
      "you're redirected to the new project",
    );

    assert.dom(PROJECT_DOCUMENT).containsText(title);

    assert.dom(PROJECT_DOCUMENT_LINK).hasAttribute("href", `/document/${id}`);
  });

  test("you can remove a document from a project", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      isDraft: false,
      status: "In-review",
      projects: [1],
    });

    this.server.create("project", {
      id: 1,
    });

    await visit("/document/doc-0");

    assert.dom(PROJECT_LINK).exists();

    await click(`${DOCUMENT_PROJECT} ${OVERFLOW_MENU_BUTTON}`);

    await click(REMOVE_FROM_PROJECT_BUTTON);

    assert.dom(PROJECT_LINK).doesNotExist();

    const document = this.server.schema.document.first();

    assert.true(document.projects.length === 0);
  });

  test("it shows an error when patching a document fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
    });

    await visit("/document/1?draft=true");

    this.server.patch("/drafts/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    // Try changing the title
    await click(`${TITLE_SELECTOR} button`);
    await fillIn(`${TITLE_SELECTOR} textarea`, "New Title");
    await triggerKeyEvent(`${TITLE_SELECTOR} textarea`, "keydown", "Enter");

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when requesting a review fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
    });

    await visit("/document/1?draft=true");

    this.server.post("/reviews/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR);

    await click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    assert.dom(MODAL_ERROR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when deleting a draft fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
    });

    await visit("/document/1?draft=true");

    this.server.delete("/drafts/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(DELETE_BUTTON);

    await click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    assert.dom(MODAL_ERROR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when approving a document fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      isDraft: false,
      status: "In-Review",
      approvers: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    this.server.post("/approvals/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(APPROVE_BUTTON);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when rejecting an FRD fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      docType: "FRD",
      isDraft: false,
      status: "In-Review",
      approvers: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    this.server.delete("/approvals/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(REJECT_FRD_BUTTON);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when changing the status of a document fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      status: "In-Review",
      approvers: [TEST_USER_EMAIL],
    });

    await visit("/document/1");

    this.server.patch("/documents/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(DOC_STATUS_TOGGLE);

    await click(`${DOC_STATUS_DROPDOWN} li:nth-child(2) button`);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when changing draft visibility fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isShareable: true,
    });

    await visit("/document/1?draft=true");

    this.server.put("/drafts/:document_id/shareable", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(DRAFT_VISIBILITY_TOGGLE_SELECTOR);

    await click(DRAFT_VISIBILITY_OPTION_SELECTOR);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when changing a draft's product area fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.createList("product", 3);

    const initialProduct = this.server.schema.products.find(2).attrs;
    const initialProductName = initialProduct.name;

    this.server.create("document", {
      objectID: 1,
      product: initialProductName,
    });

    await visit("/document/1?draft=true");

    await click(TOGGLE_SELECT);

    this.server.patch("/drafts/:document_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(PRODUCT_SELECT_DROPDOWN_ITEM);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when removing a document from a project fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In-Review",
      projects: [1],
    });

    this.server.create("project", {
      id: 1,
    });

    await visit("/document/1");

    this.server.put("/projects/:project_id/related-resources", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(`${DOCUMENT_PROJECT} ${OVERFLOW_MENU_BUTTON}`);

    await click(REMOVE_FROM_PROJECT_BUTTON);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("it shows an error when adding a document to a project fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In-Review",
    });

    this.server.create("project");

    await visit("/document/1");

    this.server.post("/projects/:project_id/related-resources", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await click(ADD_TO_PROJECT_BUTTON);

    await click(PROJECT_OPTION);

    assert.dom(FLASH_MESSAGE_SELECTOR).containsText(ERROR_MESSAGE_TEXT);
  });

  test("an error is shown when fetching document projects fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In-Review",
      projects: [1],
    });

    this.server.create("project", {
      id: 1,
    });

    this.server.get("/projects/:project_id", () => {
      return new Response(500, {}, ERROR_MESSAGE_TEXT);
    });

    await visit("/document/1");

    assert.dom(PROJECT_LINK).doesNotExist();
    assert.dom(PROJECTS_ERROR_BUTTON).exists();

    // retry the request (successfully)
    this.server.get("/projects/:project_id", () => {
      const project = this.server.schema.projects.findBy({ id: 1 });
      return new Response(200, {}, project.attrs);
    });

    await click(PROJECTS_ERROR_BUTTON);

    assert.dom(PROJECT_LINK).exists();
    assert.dom(PROJECTS_ERROR_BUTTON).doesNotExist();
  });

  test("the document locks when a 423 error is returned", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    /**
     * 423s are caught anytime the document handles an important error.
     * This test demonstrates the "failed to approve" case, but the behavior
     * is the same for all other actions.
     */
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In-Review",
      owners: [TEST_USER_2_EMAIL],
      approvers: [TEST_USER_EMAIL],
    });

    this.server.post("/approvals/:document_id", () => {
      return new Response(423, {}, "Locked");
    });

    await visit("/document/1");

    assert.dom(DISABLED_FOOTER_H5).doesNotExist("the document is not locked");

    await click(APPROVE_BUTTON);

    assert
      .dom(FLASH_MESSAGE_SELECTOR)
      .containsText("423")
      .hasAttribute("data-test-flash-notification-type", "critical");

    assert.dom(APPROVE_BUTTON).doesNotExist("the approve button is removed");

    assert.dom(DISABLED_FOOTER_H5).hasText("Document is locked");
  });

  test("owners can transfer ownership of their docs", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      id: 1,
      objectID: 1,
    });

    this.server.create("google/person", {
      emailAddresses: [{ value: TEST_USER_EMAIL }],
    });

    this.server.create("google/person", {
      emailAddresses: [{ value: TEST_USER_2_EMAIL }],
    });

    await visit("/document/1");

    await click(TRANSFER_OWNERSHIP_BUTTON);

    assert.dom(TRANSFER_OWNERSHIP_MODAL).exists();

    assert
      .dom(DOCUMENT_MODAL_PRIMARY_BUTTON)
      .hasText("Transfer doc")
      .isDisabled();

    await click(SELECT_NEW_OWNER_LABEL);

    assert
      .dom(PEOPLE_SELECT_INPUT)
      .isFocused("clicking the label focuses the input");

    await fillIn(PEOPLE_SELECT_INPUT, TEST_USER_EMAIL);

    assert
      .dom(PEOPLE_SELECT_OPTION)
      .doesNotExist("the authenticated user is not shown in the people select");

    await fillIn(PEOPLE_SELECT_INPUT, TEST_USER_2_EMAIL);

    assert.dom(PEOPLE_SELECT_OPTION).containsText(TEST_USER_2_EMAIL);

    await click(PEOPLE_SELECT_OPTION);

    assert
      .dom(PEOPLE_SELECT_INPUT)
      .isNotVisible("the input is hidden after selection");

    assert
      .dom(TYPE_TO_CONFIRM_INPUT)
      .isFocused(
        "the type-to-confirm input receives focus when a person is selected",
      );

    assert.dom(DOCUMENT_MODAL_PRIMARY_BUTTON).isDisabled();

    await fillIn(TYPE_TO_CONFIRM_INPUT, "transfer");

    assert
      .dom(DOCUMENT_MODAL_PRIMARY_BUTTON)
      .isNotDisabled("the button is enabled when both inputs are filled");

    const clickPromise = click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    await waitFor(TRANSFERRING_DOC);

    assert.dom(TRANSFERRING_DOC).containsText("Transferring doc...");

    await clickPromise;

    assert.dom(TRANSFER_OWNERSHIP_MODAL).doesNotExist();

    assert
      .dom(OWNERSHIP_TRANSFERRED_MODAL)
      .containsText("Ownership transferred")
      .containsText("User 2 has been notified of the change.");

    assert.dom(DOCUMENT_MODAL_PRIMARY_BUTTON).hasText("Close");

    await click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    assert.dom(OWNERSHIP_TRANSFERRED_MODAL).doesNotExist();

    const doc = this.server.schema.document.find(1);
    const docOwner = doc.attrs.owners[0];

    assert.equal(
      docOwner,
      TEST_USER_2_EMAIL,
      "the doc owner is updated in the back end",
    );

    assert.equal(
      currentURL(),
      "/dashboard",
      "when transferring restricted drafts, the user is redirected to the dashboard",
    );
  });

  test("an error is shown when ownership transferring fails", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      id: 1,
      objectID: 1,
      isDraft: false,
      status: "In-review",
    });

    this.server.create("google/person", {
      emailAddresses: [{ value: TEST_USER_2_EMAIL }],
    });

    await visit("/document/1");

    await click(TRANSFER_OWNERSHIP_BUTTON);

    await fillIn(PEOPLE_SELECT_INPUT, TEST_USER_2_EMAIL);
    await click(PEOPLE_SELECT_OPTION);
    await fillIn(TYPE_TO_CONFIRM_INPUT, "transfer");

    this.server.patch("/documents/:document_id", () => {
      return new Response(500, {}, "Error");
    });

    await click(DOCUMENT_MODAL_PRIMARY_BUTTON);

    assert.dom(MODAL_ERROR).exists();
  });

  test("you can add a group as an approver", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    const name = "Engineering";
    const email = "engineering@hashicorp.com";

    this.server.create("group", {
      name,
      email,
    });

    this.server.create("document", {
      objectID: 1,
      id: 1,
    });

    await visit("/document/1?draft=true");

    await click(`${APPROVERS_SELECTOR} button`);

    await fillIn(`${APPROVERS_SELECTOR} input`, name);

    assert.dom(PEOPLE_SELECT_OPTION).containsText(name).containsText(email);

    await click(PEOPLE_SELECT_OPTION);

    await click(EDITABLE_FIELD_SAVE_BUTTON_SELECTOR);

    assert.dom(APPROVERS_SELECTOR).containsText(name);

    const doc = this.server.schema.document.find(1).attrs;

    assert.true(doc.approverGroups.includes(email));

    await click(SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR);

    assert
      .dom(MODAL_PEOPLE_SELECT)
      .containsText(name, "the modal PeopleSelect includes groups");
  });
});
