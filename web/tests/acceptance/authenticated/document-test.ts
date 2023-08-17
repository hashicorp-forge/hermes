import {
  click,
  find,
  findAll,
  triggerEvent,
  visit,
  waitFor,
  waitUntil,
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
const FLASH_MESSAGE_SELECTOR = "[data-test-flash-notification]";
const SIDEBAR_TITLE_BADGE_SELECTOR = "[data-test-sidebar-title-badge]";
const TOOLTIP_SELECTOR = ".hermes-tooltip";
const DRAFT_VISIBILITY_DROPDOWN_SELECTOR =
  "[data-test-draft-visibility-dropdown]";
const DRAFT_VISIBILITY_TOGGLE_SELECTOR = "[data-test-draft-visibility-toggle]";
const COPY_URL_BUTTON_SELECTOR = "[data-test-sidebar-copy-url-button]";
const DRAFT_VISIBILITY_OPTION_SELECTOR = "[data-test-draft-visibility-option]";
const SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR = `${DRAFT_VISIBILITY_DROPDOWN_SELECTOR} li:nth-child(2)`;
const EDITABLE_TITLE_SELECTOR = "[data-test-document-title-editable]";
const EDITABLE_SUMMARY_SELECTOR = "[data-test-document-summary-editable]";
const EDITABLE_PRODUCT_AREA_SELECTOR =
  "[data-test-document-product-area-editable]";
const EDITABLE_CONTRIBUTORS_SELECTOR =
  "[data-test-document-contributors-editable]";
const EDITABLE_APPROVERS_SELECTOR = "[data-test-document-approvers-editable]";

const READ_ONLY_TITLE_SELECTOR = "[data-test-document-title-read-only]";
const READ_ONLY_SUMMARY_SELECTOR = "[data-test-document-summary-read-only]";
const READ_ONLY_PRODUCT_AREA_SELECTOR =
  "[data-test-document-product-area-read-only]";
const READ_ONLY_CONTRIBUTORS_SELECTOR =
  "[data-test-document-contributors-read-only]";
const READ_ONLY_APPROVERS_SELECTOR = "[data-test-document-approvers-read-only]";
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

const assertEditingIsDisabled = (assert: Assert) => {
  assert.dom(EDITABLE_TITLE_SELECTOR).doesNotExist();
  assert.dom(EDITABLE_SUMMARY_SELECTOR).doesNotExist();
  assert.dom(EDITABLE_PRODUCT_AREA_SELECTOR).doesNotExist();
  assert.dom(EDITABLE_CONTRIBUTORS_SELECTOR).doesNotExist();
  assert.dom(EDITABLE_APPROVERS_SELECTOR).doesNotExist();

  assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).doesNotExist();
  assert.dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR).doesNotExist();

  assert.dom(READ_ONLY_TITLE_SELECTOR).exists();
  assert.dom(READ_ONLY_SUMMARY_SELECTOR).exists();
  assert.dom(READ_ONLY_PRODUCT_AREA_SELECTOR).exists();
  assert.dom(READ_ONLY_CONTRIBUTORS_SELECTOR).exists();
  assert.dom(READ_ONLY_APPROVERS_SELECTOR).exists();
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
        "the product list item is correct"
      );
    });

    await click(productSelectDropdownItemSelector);

    assert
      .dom(productSelectSelector)
      .hasText(
        "Test Product 0",
        "The document product is updated to the selected product"
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
      "data-test-url"
    );

    assert.true(shortLinkURL?.startsWith(TEST_SHORT_LINK_BASE_URL));
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
        `${SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR} ${DRAFT_VISIBILITY_OPTION_SELECTOR}`
      )
      .doesNotHaveAttribute("data-test-is-checked")
      .hasAttribute("data-test-value", DraftVisibility.Shareable);

    const clickPromise = click(
      `${DRAFT_VISIBILITY_DROPDOWN_SELECTOR} li:nth-child(2) ${DRAFT_VISIBILITY_OPTION_SELECTOR}`
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
        "the URL to be copied is correct"
      );

    await click(DRAFT_VISIBILITY_TOGGLE_SELECTOR);

    assert
      .dom(DRAFT_VISIBILITY_OPTION_SELECTOR)
      .doesNotHaveAttribute("data-test-is-checked");

    assert
      .dom(
        `${SECOND_DRAFT_VISIBILITY_LIST_ITEM_SELECTOR} ${DRAFT_VISIBILITY_OPTION_SELECTOR}`
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

    assert.dom(EDITABLE_TITLE_SELECTOR).exists();
    assert.dom(EDITABLE_SUMMARY_SELECTOR).exists();
    assert.dom(EDITABLE_PRODUCT_AREA_SELECTOR).exists();
    assert.dom(EDITABLE_CONTRIBUTORS_SELECTOR).exists();
    assert.dom(EDITABLE_APPROVERS_SELECTOR).exists();

    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).exists();
    assert.dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR).exists();

    assert.dom(READ_ONLY_TITLE_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_SUMMARY_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_PRODUCT_AREA_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_CONTRIBUTORS_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_APPROVERS_SELECTOR).doesNotExist();
  });

  test("owners can edit everything but the product area of a published doc", async function (this: AuthenticatedDocumentRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 1,
      isDraft: false,
      status: "In review",
    });

    await visit("/document/1");

    assert.dom(EDITABLE_TITLE_SELECTOR).exists();
    assert.dom(EDITABLE_SUMMARY_SELECTOR).exists();
    assert.dom(EDITABLE_PRODUCT_AREA_SELECTOR).doesNotExist();
    assert.dom(EDITABLE_CONTRIBUTORS_SELECTOR).exists();
    assert.dom(EDITABLE_APPROVERS_SELECTOR).exists();

    assert.dom(DRAFT_VISIBILITY_TOGGLE_SELECTOR).doesNotExist();
    assert.dom(ADD_RELATED_RESOURCE_BUTTON_SELECTOR).exists();

    assert.dom(READ_ONLY_TITLE_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_SUMMARY_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_PRODUCT_AREA_SELECTOR).exists();
    assert.dom(READ_ONLY_CONTRIBUTORS_SELECTOR).doesNotExist();
    assert.dom(READ_ONLY_APPROVERS_SELECTOR).doesNotExist();
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
        "the Continue button becomes the primary button when the copy link is hidden"
      );
  });
});
