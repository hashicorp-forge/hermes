import {
  click,
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
import { TEST_SHORT_LINK_BASE_URL } from "hermes/utils/hermes-urls";

const ADD_RELATED_RESOURCE_BUTTON_SELECTOR =
  "[data-test-section-header-button-for='Related resources']";
const ADD_RELATED_DOCUMENT_OPTION_SELECTOR = ".related-document-option";
const ADD_RELATED_RESOURCE_MODAL_SELECTOR =
  "[data-test-add-related-resource-modal]";
const FLASH_MESSAGE_SELECTOR = "[data-test-flash-notification]";
const SIDEBAR_TITLE_BADGE_SELECTOR = "[data-test-sidebar-title-badge]";
const TOOLTIP_SELECTOR = ".hermes-tooltip";
const DRAFT_VISIBILITY_DROPDOWN_SELECTOR =
  "[data-test-draft-visibility-dropdown]";
const DRAFT_VISIBILITY_TOGGLE_SELECTOR = "[data-test-draft-visibility-toggle]";
const COPY_URL_BUTTON_SELECTOR = "[data-test-sidebar-copy-url-button]";
const DRAFT_VISIBILITY_OPTION_SELECTOR = "[data-test-draft-visibility-option]";
const SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR = `${DRAFT_VISIBILITY_DROPDOWN_SELECTOR} li:nth-child(2)`;

const TITLE_SELECTOR = "[data-test-document-title]";
const SUMMARY_SELECTOR = "[data-test-document-summary]";
const CONTRIBUTORS_SELECTOR = "[data-test-document-contributors]";
const APPROVERS_SELECTOR = "[data-test-document-approvers]";
const APPROVED_BADGE_SELECTOR = "[data-test-person-approved-badge]";
const PRODUCT_SELECT_SELECTOR = "[data-test-product-select]";

const EDITABLE_PRODUCT_AREA_SELECTOR =
  "[data-test-document-product-area-editable]";
const READ_ONLY_PRODUCT_AREA_SELECTOR =
  "[data-test-document-product-area-read-only]";
const SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR =
  "[data-test-sidebar-publish-for-review-button";
const PUBLISH_FOR_REVIEW_MODAL_SELECTOR =
  "[data-test-publish-for-review-modal]";
const DOCUMENT_MODAL_PRIMARY_BUTTON_SELECTOR =
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

const CUSTOM_STRING_FIELD_SELECTOR = "[data-test-custom-field-type='string']";
const CUSTOM_PEOPLE_FIELD_SELECTOR = "[data-test-custom-field-type='people']";
const EDITABLE_FIELD_SAVE_BUTTON_SELECTOR =
  ".editable-field [data-test-save-button]";
const PEOPLE_SELECT_REMOVE_BUTTON_SELECTOR =
  ".ember-power-select-multiple-remove-btn";

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
      status: "Draft",
    });
    await visit("/document/1?draft=true");
    assert.equal(getPageTitle(), "Test Document | Hermes");
  });

  test("you can change a draft's product area", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    const docID = "test-doc-0";

    this.server.createList("product", 3);

    const initialProduct = this.server.schema.products.find(2).attrs;

    const initialProductName = initialProduct.name;

    this.server.create("document", {
      objectID: docID,
      isDraft: true,
      product: initialProductName,
    });

    await visit(`/document/${docID}?draft=true`);

    const productSelectSelector = "[data-test-product-select]";
    const productSelectTriggerSelector = "[data-test-badge-dropdown-trigger]";
    const productSelectDropdownItemSelector =
      "[data-test-product-select-badge-dropdown-item]";

    assert
      .dom(productSelectSelector)
      .exists("drafts show a product select element")
      .hasText(initialProductName, "The document product is selected");

    await click(productSelectTriggerSelector);
    const options = findAll(productSelectDropdownItemSelector);

    const expectedProducts = [
      "Test Product 0",
      "Test Product 1",
      "Test Product 2",
    ];

    options.forEach((option: Element, index: number) => {
      assert.equal(
        option.textContent?.trim(),
        expectedProducts[index],
        "the product list item is correct",
      );
    });

    await click(productSelectDropdownItemSelector);

    assert
      .dom(productSelectSelector)
      .hasText(
        "Test Product 0",
        "The document product is updated to the selected product",
      );
  });

  test("a published doc's productArea can't be changed ", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      isDraft: false,
      product: "Test Product 0",
    });

    await visit("/document/1");

    assert
      .dom("[data-test-product-select]")
      .doesNotExist("published docs don't show a product select element");
  });

  test("the shortLinkURL is loaded by the config service", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", { objectID: 500, title: "Test Document" });

    await visit("/document/500");
    const shortLinkURL = find(COPY_URL_BUTTON_SELECTOR)?.getAttribute(
      "data-test-url",
    );

    assert.true(shortLinkURL?.startsWith(TEST_SHORT_LINK_BASE_URL));
  });

  test("related resources are displayed if they exist", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    // need to make sure mirage is set up to create related resources
    // outside of the context of clicking it through the document.
    // i.e., how do we connect the mirage Document and RelatedResource models?
  });

  test("a flash message displays when a related resource fails to save", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.put("/documents/:document_id/related-resources", {}, 500);

    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      product: "Test Product 0",
      appCreated: true,
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
      appCreated: true,
      status: "WIP",
      isDraft: true,
    });

    await visit("/document/1?draft=true");

    assert.dom(COPY_URL_BUTTON_SELECTOR).doesNotExist("not yet shareable");
    assert.dom(SIDEBAR_TITLE_BADGE_SELECTOR).containsText("Draft");
    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).exists();
    assert
      .dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR)
      .hasAttribute("data-test-icon", DraftVisibilityIcon.Restricted);
    assert
      .dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR)
      .hasAttribute("data-test-chevron-direction", "down");

    assert.dom(TOOLTIP_SELECTOR).doesNotExist();

    await triggerEvent(DRAFT_VISIBILITY_TOGGLE_SELECTOR, "mouseenter");

    assert
      .dom(TOOLTIP_SELECTOR)
      .hasText(capitalize(DraftVisibility.Restricted));

    await click(DRAFT_VISIBILITY_TOGGLE_SELECTOR);

    assert
      .dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR)
      .hasAttribute("data-test-chevron-direction", "up");
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
      isDraft: true,
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
      isDraft: true,
      owners: ["foo@example.com"],
      collaborators: ["testuser@example.com"],
    });

    await visit("/document/1?draft=true");

    assertEditingIsDisabled(assert);
  });

  test("collaborators cannot edit the metadata of published docs", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
      owners: ["foo@example.com"],
      collaborators: ["testuser@example.com"],
    });

    await visit("/document/1");

    assertEditingIsDisabled(assert);
  });

  test("approvers cannot edit the metadata of a published doc", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
      owners: ["foo@example.com"],
      approvers: ["testuser@example.com"],
    });

    await visit("/document/1");

    assertEditingIsDisabled(assert);
  });

  test("non-owner viewers of shareable drafts cannot edit the metadata of a draft", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: true,
      owners: ["foo@example.com"],
      isShareable: true,
    });

    await visit("/document/1?draft=true");

    assertEditingIsDisabled(assert);
  });

  test("doc owners can publish their docs for review", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: true,
      docType: "PRD",
    });

    await visit("/document/1?draft=true");

    await click(SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR);

    assert.dom(PUBLISH_FOR_REVIEW_MODAL_SELECTOR).exists();

    let clickPromise = click(DOCUMENT_MODAL_PRIMARY_BUTTON_SELECTOR);

    await waitFor(PUBLISHING_FOR_REVIEW_MESSAGE_SELECTOR);
    assert.dom(PUBLISHING_FOR_REVIEW_MESSAGE_SELECTOR).exists();

    await clickPromise;

    await waitFor(DOC_PUBLISHED_MODAL_SELECTOR);
    assert.dom(DOC_PUBLISHED_MODAL_SELECTOR).exists();

    assert
      .dom(SHARE_DOCUMENT_URL_INPUT_SELECTOR)
      .exists()
      .hasValue(`${TEST_SHORT_LINK_BASE_URL}/prd/hcp-001`);

    assert.dom(DOC_PUBLISHED_COPY_URL_BUTTON_SELECTOR).hasText("Copy link");
    assert
      .dom(CONTINUE_TO_DOCUMENT_BUTTON_SELECTOR)
      .hasText("Continue to document")
      .hasAttribute("data-test-color", "tertiary");

    // TODO: Assert that clicking the modal dismisses it.
    // Requires @hashicorp/design-system-components 2.9.0+
    // https://github.com/hashicorp/design-system/commit/a6553ea032f70f0167f149589801b72154c3cf75
  });

  test('the "document published" modal hides the share elements if the docNumber fails to load', async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: true,
      docType: "PRD",
      docNumber: "LAB-???",
    });

    await visit("/document/1?draft=true");

    await click(SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON_SELECTOR);
    await click(DOCUMENT_MODAL_PRIMARY_BUTTON_SELECTOR);

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
      isDraft: true,
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
      isDraft: true,
    });

    await visit("/document/1?draft=true");

    await click("[data-test-related-resources-list-empty-state]");
    await waitFor(ADD_RELATED_RESOURCE_MODAL_SELECTOR);

    assert.dom(ADD_RELATED_RESOURCE_MODAL_SELECTOR).exists();
  });

  test("the title attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      title: "Test Document",
      isDraft: true,
    });

    await visit("/document/1?draft=true");

    await click(`${TITLE_SELECTOR} button`);

    await fillIn(`${TITLE_SELECTOR} textarea`, "New Title");

    await triggerKeyEvent(`${TITLE_SELECTOR} textarea`, "keydown", "Enter");

    assert.dom(TITLE_SELECTOR).hasText("New Title");
  });

  test("the summary attribute saves", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      summary: "foo bar baz",
      isDraft: true,
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
      contributors: ["foo@example.com"],
      isDraft: true,
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
      approvers: ["foo@example.com"],
      isDraft: true,
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
      isDraft: true,
    });

    await visit("/document/1?draft=true");

    assert.dom(PRODUCT_SELECT_SELECTOR).hasText("Bar");

    await click(`${PRODUCT_SELECT_SELECTOR} button`);

    await click(`[data-test-product-select-badge-dropdown-item]`);

    assert.dom(PRODUCT_SELECT_SELECTOR).hasText("Foo");

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
      isDraft: true,
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
      foo: ["foo@example.com"],
      isDraft: true,
    });

    await visit("/document/1?draft=true");

    await click(`${CUSTOM_PEOPLE_FIELD_SELECTOR} button`);

    // Delete the existing contributor and save
    await click(PEOPLE_SELECT_REMOVE_BUTTON_SELECTOR);
    await click(EDITABLE_FIELD_SAVE_BUTTON_SELECTOR);

    assert.dom(CUSTOM_PEOPLE_FIELD_SELECTOR).hasText("None");
  });

  test("approvers who have approved a document are badged with a checkmark", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      approvers: ["foo@example.com", "bar@example.com"],
      approvedBy: ["foo@example.com"],
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
});
