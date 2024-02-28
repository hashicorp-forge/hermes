import {
  click,
  currentURL,
  fillIn,
  find,
  findAll,
  visit,
} from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { FacetLabel } from "hermes/helpers/get-facet-label";

// Global
const GLOBAL_SEARCH_INPUT = "[data-test-global-search-input]";
const VIEW_ALL_DOCS_LINK = "[data-test-view-all-docs-link]";

// Header
const DOC_SEARCH_RESULT = "[data-test-doc-search-result]";
const RESULTS_HEADER_TEXT = "[data-test-results-header-text]";
const ACTIVE_FILTER_LIST = "[data-test-active-filter-list]";
const ACTIVE_FILTER_LINK = "[data-test-active-filter-link]";
const CLEAR_ALL_FILTERS_LINK = "[data-test-clear-all-filters-link]";

// Filter buttons
const TRIGGER = "data-test-facet-dropdown-trigger";
const DOC_TYPE_FACET_DROPDOWN_TOGGLE = `[${TRIGGER}="${FacetLabel.DocType}"]`;
const PRODUCT_FACET_DROPDOWN_TOGGLE = `[${TRIGGER}="${FacetLabel.Product}"]`;

// Filter dropdowns
const FACET_DROPDOWN_LINK = "[data-test-facet-dropdown-link]";

interface Context extends MirageTestContext {}

module("Acceptance | authenticated/results", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct (query)", async function (this: Context, assert) {
    await visit("/results?q=foo");
    assert.equal(getPageTitle(), "foo • Search | Hermes");
  });

  test("the page title is correct (no query)", async function (this: Context, assert) {
    await visit("/results");
    assert.equal(getPageTitle(), "Search | Hermes");
  });

  test("it shows document results", async function (this: Context, assert) {
    const normalDocCount = 5;

    this.server.createList("document", normalDocCount);

    const uniqueTitle = "Food Car Maps";

    this.server.create("document", {
      title: uniqueTitle,
    });

    await visit("/results"); // a query-less search will return everything

    const totalDocCount = normalDocCount + 1;

    assert.dom(DOC_SEARCH_RESULT).exists({ count: totalDocCount });

    assert
      .dom(RESULTS_HEADER_TEXT)
      .hasText(
        `${totalDocCount} documents`,
        "the correct header text is shown (plural, no query)",
      );

    // search for title
    await visit(`/results?q=${uniqueTitle.replace(" ", "+")}`);

    assert.dom(DOC_SEARCH_RESULT).exists({ count: 1 });

    assert
      .dom(RESULTS_HEADER_TEXT)
      .hasText(
        `1 document matching ${uniqueTitle}`,
        "the correct header text is shown (singular, with query)",
      );
  });

  test("you can filter results", async function (this: Context, assert) {
    // Create 3 RFCs
    // 2 for Vault; 1 for Terraform

    this.server.createList("document", 4, {
      docType: "RFC",
      product: "Vault",
    });
    this.server.create("document", {
      docType: "RFC",
      product: "Terraform",
    });

    // Create 5 FRDs
    // 4 for Vault; 1 for Terraform

    this.server.createList("document", 2, {
      docType: "FRD",
      product: "Vault",
    });
    this.server.create("document", {
      docType: "FRD",
      product: "Terraform",
    });

    // Capture the docCounts we intend to test

    const rfcCount = this.server.schema.document.where({
      docType: "RFC",
    }).length;

    const frdCount = this.server.schema.document.where({
      docType: "FRD",
    }).length;

    const totalDocCount = rfcCount + frdCount;

    const terraformDocCount = this.server.schema.document.where({
      product: "Terraform",
    }).length;

    // Capture placeholder dropdown-link elements

    let firstFacet;
    let secondFacet;

    // Helper function to capture the dropdown-link elements

    const captureFacetElements = () => {
      firstFacet = find(FACET_DROPDOWN_LINK);
      secondFacet = findAll(FACET_DROPDOWN_LINK)[1];
    };

    await visit("/results");

    assert.dom(RESULTS_HEADER_TEXT).containsText(`${totalDocCount}`);
    assert.dom(DOC_SEARCH_RESULT).exists({ count: totalDocCount });

    assert
      .dom(ACTIVE_FILTER_LIST)
      .doesNotExist("the active filters section is hidden");

    // Open the docType facet dropdown

    await click(DOC_TYPE_FACET_DROPDOWN_TOGGLE);

    captureFacetElements();

    assert
      .dom(FACET_DROPDOWN_LINK)
      .exists({ count: 2 }, "two docType facets are shown");

    assert.dom(firstFacet).containsText("RFC").containsText(`${rfcCount}`);
    assert.dom(secondFacet).containsText("FRD").containsText(`${frdCount}`);

    // Click the FRD filter

    await click(secondFacet as unknown as Element);

    assert.dom(RESULTS_HEADER_TEXT).containsText(`${frdCount}`);
    assert.dom(DOC_SEARCH_RESULT).exists({ count: frdCount });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .containsText("FRD")
      .hasAttribute(
        "href",
        "/results",
        "the filter is shown in the active filters section with the correct link to remove it",
      );

    assert.dom(CLEAR_ALL_FILTERS_LINK).hasAttribute("href", "/results");

    assert.dom(DOC_SEARCH_RESULT).exists({ count: frdCount });

    // Open the product facet dropdown

    await click(PRODUCT_FACET_DROPDOWN_TOGGLE);

    captureFacetElements();

    assert
      .dom(FACET_DROPDOWN_LINK)
      .exists({ count: 2 }, "two product facets are shown");

    assert.dom(firstFacet).containsText("Vault");
    assert.dom(secondFacet).containsText("Terraform");

    // Click the Terraform filter

    await click(secondFacet as unknown as Element);

    assert.dom(RESULTS_HEADER_TEXT).containsText("1");
    assert.dom(DOC_SEARCH_RESULT).exists({ count: 1 });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .exists({ count: 2 }, "two active filters are shown");

    // Confirm that the active filter tags have the correct hrefs

    assert
      .dom(ACTIVE_FILTER_LINK)
      .containsText("FRD")
      .hasAttribute(
        "href",
        "/results?product=%5B%22Terraform%22%5D",
        "correct href to remove the filter",
      );

    const secondFilter = findAll(ACTIVE_FILTER_LINK)[1];

    assert
      .dom(secondFilter)
      .containsText("Terraform")
      .hasAttribute(
        "href",
        "/results?docType=%5B%22FRD%22%5D",
        "correct href to remove the filter",
      );

    // Turn off the original docType filter

    await click(ACTIVE_FILTER_LINK);

    assert.dom(RESULTS_HEADER_TEXT).containsText(`${terraformDocCount}`);
    assert.dom(DOC_SEARCH_RESULT).exists({ count: terraformDocCount });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .exists({ count: 1 }, "only the product filter is active")
      .hasAttribute("href", "/results", "the active filter link is correct");

    // Turn off all filters

    await click(CLEAR_ALL_FILTERS_LINK);

    assert.dom(RESULTS_HEADER_TEXT).containsText(`${totalDocCount}`);

    assert.dom(DOC_SEARCH_RESULT).exists({ count: totalDocCount });

    assert
      .dom(ACTIVE_FILTER_LIST)
      .doesNotExist("the active filters section is hidden");
  });

  test("the search input displays the route query on load", async function (this: Context, assert) {
    const query = "foo";

    await visit(`/results?q=${query}`);

    assert.dom(GLOBAL_SEARCH_INPUT).hasValue(query);
  });

  test("search filters reset when the query changes", async function (this: Context, assert) {
    const title = "baz";

    this.server.create("document", {
      title,
    });

    const initialURL = "/results?q=bar&page=2&status=%5B%22Approved%22%5D";

    await visit(initialURL);

    assert.equal(currentURL(), initialURL);

    await fillIn(GLOBAL_SEARCH_INPUT, title);
    await click(VIEW_ALL_DOCS_LINK);

    assert.equal(
      currentURL(),
      `/results?q=${title}`,
      "the query is updated and the non-query filters are removed",
    );
  });
});
