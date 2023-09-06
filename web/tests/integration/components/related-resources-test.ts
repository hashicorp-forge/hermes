import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
  find,
  render,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { Response } from "miragejs";
import config from "hermes/config/environment";
import algoliaHosts from "hermes/mirage/algolia/hosts";
import { RelatedResource } from "hermes/components/document/sidebar/related-resources";
import { RelatedResourcesScope } from "hermes/components/related-resources";

const RELATED_DOCUMENT_OPTION_SELECTOR = ".related-document-option";
const ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR =
  "[data-test-related-resources-search-input]";
const NO_RESOURCES_FOUND_SELECTOR = "[data-test-no-related-resources-found]";
const ADD_EXTERNAL_RESOURCE_FORM_SELECTOR =
  "[data-test-add-external-resource-form]";
const EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR = ".external-resource-title-input";
const ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR =
  "[data-test-add-external-resource-submit-button]";
const ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR =
  "[data-test-add-external-resource-error]";
const ADD_RESOURCE_MODAL_SELECTOR = "[data-test-add-related-resource-modal]";
const CURRENT_DOMAIN_PROTOCOL = window.location.protocol + "//";
const CURRENT_DOMAIN = window.location.hostname;
const CURRENT_PORT = window.location.port;
const SHORT_LINK_BASE_URL = config.shortLinkBaseURL;
const SEARCH_ERROR_MESSAGE = "Search error. Type to retry.";

interface RelatedResourcesComponentTestContext extends MirageTestContext {
  modalHeaderTitle: string;
  modalInputPlaceholder: string;
  addResource: (resource: RelatedResource) => void;
  items?: RelatedResource[];
  isLoading?: boolean;
  loadingHasFailed?: boolean;
  scope: `${RelatedResourcesScope}`;
}

module("Integration | Component | related-resources", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: RelatedResourcesComponentTestContext) {
    this.set("modalHeaderTitle", "Modal title");
    this.set("modalInputPlaceholder", "Modal input placeholder");
    this.set("addResource", (resource: RelatedResource) => {
      const items = this.items || [];
      this.set("items", [...items, resource]);
    });
    this.set("items", undefined);
  });

  test("it yields list blocks", async function (this: RelatedResourcesComponentTestContext, assert) {
    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="documents"
      >
        <:list as |rr|>
          <div class="list"/>
          {{#each rr.items as |item|}}
            {{!@glint-ignore}}
            <div class="item">{{item}}</div>
          {{/each}}
        </:list>
        <:list-empty>
          <div class="empty"/>
        </:list-empty>
      </RelatedResources>
    `);

    assert
      .dom(".empty")
      .exists("the list-empty block yields when there are no items");

    assert.dom(".list").doesNotExist();

    this.set("items", ["item1", "item2"]);

    assert.dom(".empty").doesNotExist();
    assert.dom(".list").exists();
    assert.dom(".item").exists({ count: 2 });
  });

  test("it yields a loading block", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.set("isLoading", true);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @isLoading={{this.isLoading}}
        @scope="documents"
      >
        <:list-loading>
          <div class="loading"/>
        </:list-loading>
        <:list-empty>
          <div class="empty"/>
        </:list-empty>
      </RelatedResources>
    `);

    assert.dom(".loading").exists();
    assert.dom(".empty").doesNotExist();

    this.set("isLoading", false);

    assert.dom(".loading").doesNotExist();
    assert.dom(".empty").exists();
  });

  test("it yields an error block when related resources fail to load", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.set("loadingHasFailed", true);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @loadingHasFailed={{this.loadingHasFailed}}
        @scope="documents"
      >
        <:list-error>
          <div class="error"/>
        </:list-error>
        <:list-empty>
          <div class="empty"/>
        </:list-empty>
      </RelatedResources>
    `);

    assert.dom(".error").exists();
    assert.dom(".empty").doesNotExist();

    this.set("loadingHasFailed", false);

    assert.dom(".error").doesNotExist();
    assert.dom(".empty").exists();
  });

  test('it yields a header block with a "show modal" action', async function (this: RelatedResourcesComponentTestContext, assert) {
    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="documents"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Show modal</button>
        </:header>
      </RelatedResources>
    `);

    assert.dom("button").exists();

    await click("button");

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);

    assert.dom(ADD_RESOURCE_MODAL_SELECTOR).exists();
  });

  // do we want this component to handle editing, removing?

  test("you can add related hermes documents", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    this.set("addResource", (resource: RelatedResource) => {
      this.set("items", [resource]);
    });

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="documents"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
        <:list as |rr|>
         {{! can this improve}}
          <div class="list"/>
          {{#each rr.items as |item|}}
            {{!@glint-ignore}}
            <div class="item">{{item.title}}</div>
          {{/each}}
        </:list>
        <:list-empty>
          <div class="empty"/>
        </:list-empty>
      </RelatedResources>
    `);

    assert.dom(".empty").exists();

    await click("button");

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);
    await click(RELATED_DOCUMENT_OPTION_SELECTOR);

    assert.dom(ADD_RESOURCE_MODAL_SELECTOR).doesNotExist();
    assert.dom(".empty").doesNotExist();

    assert.dom(".list").exists();
    assert.dom(".item").hasText("Test Document 0");
  });

  test('it shows a "no results" fallback message when searching documents', async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    await click("button");

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);

    assert.dom(RELATED_DOCUMENT_OPTION_SELECTOR).exists({ count: 3 });

    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, "XYZ");

    await waitFor(NO_RESOURCES_FOUND_SELECTOR);

    assert.dom(NO_RESOURCES_FOUND_SELECTOR).exists();

    assert.dom(RELATED_DOCUMENT_OPTION_SELECTOR).doesNotExist();
  });

  test("you can add related external links as a fallback", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
        <:list as |rr|>
          <div class="list"/>
          {{#each rr.items as |item|}}
            {{!@glint-ignore}}
            <div class="item">{{item.name}}</div>
          {{/each}}
        </:list>
      </RelatedResources>
    `);

    assert.dom(".list").doesNotExist();

    await click("button");

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);

    assert.dom(RELATED_DOCUMENT_OPTION_SELECTOR).exists({ count: 3 });

    await fillIn(
      ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
      "https://example.com"
    );

    assert
      .dom(RELATED_DOCUMENT_OPTION_SELECTOR)
      .doesNotExist("documents are removed when a valid URL is entered");
    assert.dom(ADD_EXTERNAL_RESOURCE_FORM_SELECTOR).exists();

    assert
      .dom(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR)
      .hasAttribute("placeholder", "Enter a title");

    // Try to add a resource without a title

    await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

    // Confirm that it fails

    assert
      .dom(ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR)
      .hasText("A title is required.");

    // Now add a a title

    await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR, "Example");
    await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

    assert.dom(ADD_RESOURCE_MODAL_SELECTOR).doesNotExist("the modal is closed");
    assert.dom(".item").hasText("Example");
  });

  test("it prevents duplicate external links", async function (this: RelatedResourcesComponentTestContext, assert) {
    const url = "https://example.com";

    this.server.create("relatedExternalLink", {
      url,
    });

    this.set("items", this.server.schema.relatedExternalLinks.all().models);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
        <:list as |rr|>
          <div class="list"/>
          {{#each rr.items as |item|}}
            {{!@glint-ignore}}
            <div class="item">{{item}}</div>
          {{/each}}
        </:list>
      </RelatedResources>
    `);

    await click("button");

    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, url);

    assert
      .dom(ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR)
      .hasText("This resource has already been added.");

    await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

    assert
      .dom(ADD_RESOURCE_MODAL_SELECTOR)
      .exists("the button is disabled when the URL is a duplicate");

    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, "https://");

    assert
      .dom(ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR)
      .doesNotExist("the error message is removed when the URL changes");
  });

  test("you can scope the component to document resource", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="documents"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    await click("button");

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);

    await fillIn(
      ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
      "https://hashicorp.com"
    );

    assert.dom(NO_RESOURCES_FOUND_SELECTOR).exists();
    assert.dom(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR).doesNotExist();
  });

  test("you can scope the component to external-link resources", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="external-links"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    await click("button");

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);

    assert.dom(RELATED_DOCUMENT_OPTION_SELECTOR).doesNotExist();
    // TODO: assert the form exists
  });

  test("first-class links are recognized (full URL)", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    const docID = "777";
    const docTitle = "Jackpot!";

    this.server.create("document", {
      id: docID,
      title: docTitle,
    });

    this.server.create("document");

    await render<RelatedResourcesComponentTestContext>(hbs`
        <RelatedResources
          @items={{this.items}}
          @modalHeaderTitle={{this.modalHeaderTitle}}
          @modalInputPlaceholder={{this.modalInputPlaceholder}}
          @addResource={{this.addResource}}
          @scope="all"
        >
          <:header as |rr|>
            <button {{on "click" rr.showModal}}>Add</button>
          </:header>
        </RelatedResources>
      `);

    await click("button");

    // Construct a "valid" first-class Hermes URL
    const documentURL = `${CURRENT_DOMAIN_PROTOCOL}${CURRENT_DOMAIN}:${CURRENT_PORT}/document/${docID}`;

    await waitFor(ADD_RESOURCE_MODAL_SELECTOR);

    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, documentURL);
    await waitFor(RELATED_DOCUMENT_OPTION_SELECTOR);

    assert
      .dom(RELATED_DOCUMENT_OPTION_SELECTOR)
      .containsText(docTitle, "the document URL is correctly parsed");

    // Reset the input
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, "");

    // Confirm the reset
    assert.dom(RELATED_DOCUMENT_OPTION_SELECTOR).doesNotContainText(docTitle);

    // Construct a first-class Google URL
    const googleURL = `https://docs.google.com/document/d/${docID}/edit`;

    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, googleURL);
    await waitFor(RELATED_DOCUMENT_OPTION_SELECTOR);

    assert
      .dom(RELATED_DOCUMENT_OPTION_SELECTOR)
      .containsText(docTitle, "the Google URL is correctly parsed");
  });

  test("first-class links are recognized (short URL)", async function (this: RelatedResourcesComponentTestContext, assert) {
    const docID = "777";
    const docTitle = "Jackpot!";
    const docType = "PRD";
    const docNumber = "VLT-777";

    this.server.create("document", {
      id: docID,
      objectID: docID,
      title: docTitle,
      docType,
      docNumber,
    });

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    const shortLink = `${SHORT_LINK_BASE_URL}/${docType}/${docNumber}`;

    await click("button");

    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, shortLink);

    await waitFor(RELATED_DOCUMENT_OPTION_SELECTOR);

    assert
      .dom(RELATED_DOCUMENT_OPTION_SELECTOR)
      .containsText(docTitle, "the shortLink is correctly parsed");
  });

  test("an invalid hermes URL is handled like an external link", async function (this: RelatedResourcesComponentTestContext, assert) {
    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    // We build a URL with the correct format, but an invalid ID.

    const documentURL = `${CURRENT_DOMAIN_PROTOCOL}${CURRENT_DOMAIN}:${CURRENT_PORT}/document/999`;

    await click("button");
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, documentURL);

    assert
      .dom(ADD_EXTERNAL_RESOURCE_FORM_SELECTOR)
      .exists('the "add resource" form is shown');
  });

  test("an invalid shortLink URL is handled like an external link", async function (this: RelatedResourcesComponentTestContext, assert) {
    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    const shortLink = `${SHORT_LINK_BASE_URL}/RFC/VLT-999`;

    await click("button");
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, shortLink);

    assert
      .dom(ADD_EXTERNAL_RESOURCE_FORM_SELECTOR)
      .exists('the "add resource" form is shown');
  });

  test("a duplicate first-class link is handled (full URL)", async function (this: RelatedResourcesComponentTestContext, assert) {
    const docID = "777";
    const docTitle = "Foo";

    this.server.create("document", {
      id: docID,
      title: docTitle,
      objectID: docID,
    });

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    await click("button");

    const documentURL = `${CURRENT_DOMAIN_PROTOCOL}${CURRENT_DOMAIN}:${CURRENT_PORT}/document/${docID}`;

    // Find and add the document
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, documentURL);
    await click(RELATED_DOCUMENT_OPTION_SELECTOR);

    // Reopen the modal and paste the same URL
    await click("button");
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, documentURL);

    assert
      .dom(NO_RESOURCES_FOUND_SELECTOR)
      .hasText("This doc has already been added.");
  });

  test("a duplicate first-class link is handled (short URL)", async function (this: RelatedResourcesComponentTestContext, assert) {
    const docID = "777";
    const docTitle = "Foo";
    const docNumber = "VLT-777";

    this.server.create("document", {
      id: docID,
      title: docTitle,
      objectID: docID,
      docNumber,
    });

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    const shortLink = `${SHORT_LINK_BASE_URL}/RFC/${docNumber}`;

    await click("button");

    // Find and add the document
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, shortLink);
    await click(RELATED_DOCUMENT_OPTION_SELECTOR);

    // Reopen the modal and paste the same URL
    await click("button");
    await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, shortLink);

    assert
      .dom(NO_RESOURCES_FOUND_SELECTOR)
      .hasText("This doc has already been added.");
  });

  test("a non-404 getAlgoliaObject call is handled", async function (this: RelatedResourcesComponentTestContext, assert) {
    algoliaHosts.forEach((host) => {
      this.server.get(host, () => {
        return new Response(500, {}, {});
      });
    });

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    await click("button");

    // Enter what looks like a valid URL to trigger an object lookup
    await fillIn(
      ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
      `${CURRENT_DOMAIN_PROTOCOL}${CURRENT_DOMAIN}:${CURRENT_PORT}/document/xyz`
    );

    await waitFor(NO_RESOURCES_FOUND_SELECTOR);

    await waitUntil(() => {
      return find(NO_RESOURCES_FOUND_SELECTOR)?.textContent?.includes(
        SEARCH_ERROR_MESSAGE
      );
    });

    assert.dom(NO_RESOURCES_FOUND_SELECTOR).containsText(SEARCH_ERROR_MESSAGE);
  });

  test("it shows an error when searching fails", async function (this: RelatedResourcesComponentTestContext, assert) {
    this.server.createList("document", 3);

    algoliaHosts.forEach((host) => {
      this.server.post(host, () => {
        return new Response(500, {}, {});
      });
    });

    await render<RelatedResourcesComponentTestContext>(hbs`
      <RelatedResources
        @items={{this.items}}
        @modalHeaderTitle={{this.modalHeaderTitle}}
        @modalInputPlaceholder={{this.modalInputPlaceholder}}
        @addResource={{this.addResource}}
        @scope="all"
      >
        <:header as |rr|>
          <button {{on "click" rr.showModal}}>Add</button>
        </:header>
      </RelatedResources>
    `);

    await click("button");

    await waitFor(NO_RESOURCES_FOUND_SELECTOR);
    assert
      .dom(NO_RESOURCES_FOUND_SELECTOR)
      .containsText(
        SEARCH_ERROR_MESSAGE,
        "the error message is shown in the modal"
      );
  });
});
