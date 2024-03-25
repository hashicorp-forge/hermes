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
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";
import { TEST_USER_2_EMAIL, TEST_USER_EMAIL } from "hermes/mirage/utils";

// Global
const GLOBAL_SEARCH_INPUT = "[data-test-global-search-input]";
const VIEW_ALL_RESULTS_LINK = "[data-test-view-all-results-link]";

// Header
const RESULTS_HEADLINE = "[data-test-results-headline]";
const RESULTS_MATCH_COUNT = "[data-test-results-match-count]";
const ACTIVE_FILTER_LIST = "[data-test-active-filter-list]";
const ACTIVE_FILTER_LINK = "[data-test-active-filter-link]";
const CLEAR_ALL_FILTERS_LINK = "[data-test-clear-all-filters-link]";

// Segmented Control
const SEG = "[data-test-results-nav]";
const SEG_PROJECTS_LINK = `${SEG} [data-test-projects-link]`;
const SEG_DOCS_LINK = `${SEG} [data-test-docs-link]`;
const SEG_ALL_LINK = `${SEG} [data-test-all-link]`;

// Section Header
const SECTION_HEADER = "[data-test-section-header]";
const COUNT = "[data-test-count]";
const PRODUCT_RESULTS_CONTAINER = "[data-test-product-results]";
const PRODUCT_RESULTS_HEADER = `${PRODUCT_RESULTS_CONTAINER} ${SECTION_HEADER}`;
const PRODUCT_COUNT = `${PRODUCT_RESULTS_CONTAINER} ${COUNT}`;
const PRODUCT_LINK = `${PRODUCT_RESULTS_CONTAINER} [data-test-product-link]`;

const PROJECT_RESULTS_CONTAINER = "[data-test-project-results]";
const PROJECT_RESULTS_HEADER = `${PROJECT_RESULTS_CONTAINER} ${SECTION_HEADER}`;
const PROJECT_COUNT = `${PROJECT_RESULTS_CONTAINER} ${COUNT}`;
const PROJECT_LINK = "[data-test-project-link]";
const PROJECT_PRODUCT_AVATAR = `${PROJECT_LINK} [data-test-product-avatar]`;

const DOC_RESULTS_CONTAINER = "[data-test-doc-results]";
const DOC_RESULTS_HEADER = `${DOC_RESULTS_CONTAINER} ${SECTION_HEADER}`;
const DOC_COUNT = `${DOC_RESULTS_CONTAINER} ${COUNT}`;
const DOC_LINK = "[data-test-doc-link]";
const NEXT_PAGE_LINK = "[data-test-next-page-link]";

// Filter buttons
const FACET_TOGGLE = "[data-test-facet-dropdown-toggle]";
const FACET_TOGGLE_DATA_NAME = "data-test-facet-dropdown-trigger";
const DOC_TYPE_FACET_DROPDOWN_TOGGLE = `[${FACET_TOGGLE_DATA_NAME}="${FacetLabel.DocType}"]`;
const PRODUCT_FACET_DROPDOWN_TOGGLE = `[${FACET_TOGGLE_DATA_NAME}="${FacetLabel.Product}"]`;

// Filter dropdowns
const FACET_DROPDOWN_LINK = "[data-test-facet-dropdown-link]";

// Owner filter
const OWNERS_INPUT = `[data-test-search-owners-input]`;
const OWNER_MATCH = "[data-test-x-dropdown-list-item-link-to]";

// Pagination
const PAGINATION = "[data-test-pagination]";

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

  test('there is a "top results" screen', async function (this: Context, assert) {
    const query = "v"; // This will match `Vault` in the product facet
    const docCount = 50;
    const docMax = 12;
    const projectCount = 10;
    const projectMax = 5;

    this.server.createList("document", 50, {
      title: query,
    });

    this.server.createList("project", 10, {
      title: query,
    });

    await visit(`/results?q=${query}`);

    assert.dom(SEG_PROJECTS_LINK).doesNotHaveClass("active");
    assert.dom(SEG_DOCS_LINK).doesNotHaveClass("active");
    assert.dom(SEG_ALL_LINK).hasClass("active");

    assert
      .dom(FACET_TOGGLE)
      .doesNotExist('filter bar is hidden in the "all" view');

    assert
      .dom(PAGINATION)
      .doesNotExist('pagination is hidden in the "all" view');

    assert
      .dom(RESULTS_MATCH_COUNT)
      .doesNotExist('match count is hidden in the "all view');

    assert.dom(PRODUCT_RESULTS_HEADER).exists().doesNotHaveAttribute("href");
    assert.dom(PRODUCT_COUNT).containsText("1");

    assert
      .dom(PRODUCT_LINK)
      .exists({ count: 1 })
      .containsText("Vault")
      .hasAttribute("href", "/product-areas/vault");

    assert
      .dom(PROJECT_RESULTS_HEADER)
      .exists()
      .hasAttribute("href", `/results?q=${query}&scope=Projects`);

    assert.dom(PROJECT_COUNT).containsText(projectCount.toString());
    assert.dom(PROJECT_LINK).exists({ count: projectMax });
    assert
      .dom(PROJECT_PRODUCT_AVATAR)
      .exists(
        { count: projectMax },
        "product avatars are loaded from the back end",
      );

    assert
      .dom(DOC_RESULTS_HEADER)
      .exists()
      .hasAttribute("href", `/results?q=${query}&scope=Docs`);

    assert.dom(DOC_COUNT).containsText(docCount.toString());
    assert.dom(DOC_LINK).exists({ count: docMax });

    assert
      .dom(NEXT_PAGE_LINK)
      .exists()
      .hasAttribute("href", `/results?page=2&q=${query}&scope=Docs`);
  });

  test('match count is shown in the "all" view when there are no results', async function (this: Context, assert) {
    await visit("/results");
    assert.dom(RESULTS_MATCH_COUNT).containsText("0 matches");
  });

  test("it can scope to project results", async function (this: Context, assert) {
    const normalProjectCount = 5;

    this.server.createList("project", normalProjectCount);

    const uniqueTitle = "Food Car Maps";

    this.server.create("project", {
      title: uniqueTitle,
    });

    await visit("/results?scope=Projects");

    assert.dom(SEG_PROJECTS_LINK).hasClass("active");
    assert.dom(SEG_DOCS_LINK).doesNotHaveClass("active");
    assert.dom(SEG_ALL_LINK).doesNotHaveClass("active");

    assert
      .dom(FACET_TOGGLE)
      .exists({ count: 1 }, "only the status filter is shown");

    assert.dom(PAGINATION).exists('pagination is shown in the "projects" view');

    assert.dom(PROJECT_LINK).exists({ count: normalProjectCount + 1 });

    assert.dom(RESULTS_HEADLINE).hasText("Results");

    assert
      .dom(RESULTS_MATCH_COUNT)
      .hasText(
        `${(normalProjectCount + 1).toString()} matches`,
        "the correct header text is shown (plural)",
      );

    // search for title
    await visit(`/results?q=${uniqueTitle.replace(" ", "+")}&scope=Projects`);

    assert.dom(PROJECT_LINK).exists({ count: 1 });

    assert.dom(RESULTS_HEADLINE).hasText(`Results for ${uniqueTitle}`);
    assert
      .dom(RESULTS_MATCH_COUNT)
      .hasText("1 match", "the correct header text is shown (singular)");
  });

  test("it can scope to document results", async function (this: Context, assert) {
    const normalDocCount = 5;

    this.server.createList("document", normalDocCount);

    const uniqueTitle = "Food Car Maps";

    this.server.create("document", {
      title: uniqueTitle,
    });

    await visit("/results?scope=Docs"); // a query-less search will return everything

    assert.dom(SEG_PROJECTS_LINK).doesNotHaveClass("active");
    assert.dom(SEG_DOCS_LINK).hasClass("active");
    assert.dom(SEG_ALL_LINK).doesNotHaveClass("active");

    assert.dom(FACET_TOGGLE).exists('filter bar is shown in the "docs" view');

    assert.dom(PAGINATION).exists('pagination is shown in the "docs" view');

    const totalDocCount = normalDocCount + 1;

    assert.dom(DOC_LINK).exists({ count: totalDocCount });

    assert.dom(RESULTS_HEADLINE).hasText("Results");

    assert
      .dom(RESULTS_MATCH_COUNT)
      .hasText(
        `${totalDocCount.toString()} matches`,
        "the correct header text is shown (plural)",
      );

    // search for title
    await visit(`/results?q=${uniqueTitle.replace(" ", "+")}&scope=Docs`);

    assert.dom(DOC_LINK).exists({ count: 1 });

    assert.dom(RESULTS_HEADLINE).hasText(`Results for ${uniqueTitle}`);
    assert
      .dom(RESULTS_MATCH_COUNT)
      .hasText("1 match", "the correct header text is shown (singular)");
  });

  test("you can filter results (projects)", async function (this: Context, assert) {
    // Create 3 projects
    // 2 active; 1 completed

    this.server.createList("project", 2, {
      status: ProjectStatus.Active,
    });
    this.server.create("project", {
      status: ProjectStatus.Completed,
    });

    // Capture the projectCounts we intend to test

    const activeProjectCount = this.server.schema.projects.where({
      status: ProjectStatus.Active,
    }).length;

    const completedProjectCount = this.server.schema.projects.where({
      status: ProjectStatus.Completed,
    }).length;

    const totalProjectCount = activeProjectCount + completedProjectCount;

    // Capture placeholder dropdown-link elements

    let firstFacet;
    let secondFacet;

    // Helper function to capture the dropdown-link elements

    const captureFacetElements = () => {
      firstFacet = find(FACET_DROPDOWN_LINK);
      secondFacet = findAll(FACET_DROPDOWN_LINK)[1];
    };

    await visit("/results?scope=Projects");

    assert.dom(RESULTS_MATCH_COUNT).containsText(`${totalProjectCount}`);

    assert.dom(PROJECT_LINK).exists({ count: totalProjectCount });

    assert
      .dom(ACTIVE_FILTER_LIST)
      .doesNotExist("the active filters section is hidden");

    assert
      .dom(FACET_TOGGLE)
      .exists({ count: 1 }, "only the status facet is shown");

    await click(FACET_TOGGLE);

    captureFacetElements();

    assert
      .dom(firstFacet)
      .containsText(
        projectStatusObjects[ProjectStatus.Active].label,
        "the filter is properly capitalized",
      )
      .containsText(`${activeProjectCount}`);
    assert
      .dom(secondFacet)
      .containsText(
        projectStatusObjects[ProjectStatus.Completed].label,
        "the filter is properly capitalized",
      )
      .containsText(`${completedProjectCount}`);

    // Click the Completed filter

    await click(secondFacet as unknown as Element);

    assert.dom(RESULTS_MATCH_COUNT).containsText(`${completedProjectCount}`);
    assert.dom(PROJECT_LINK).exists({ count: completedProjectCount });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .containsText("Completed")
      .hasAttribute(
        "href",
        "/results?scope=Projects",
        "the filter is shown in the active filters section with the correct link to remove it",
      );

    assert
      .dom(CLEAR_ALL_FILTERS_LINK)
      .hasAttribute("href", "/results?scope=Projects");

    assert.dom(PROJECT_LINK).exists({ count: completedProjectCount });

    // visit a URL with no results

    await visit("/results?q=qwe123&scope=Projects");

    assert.dom(FACET_TOGGLE).exists({ count: 1 }).isDisabled();
    assert.dom(RESULTS_MATCH_COUNT).containsText("0 matches");
  });

  test("you can filter results (docs)", async function (this: Context, assert) {
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

    // Create an RFC with another owner
    this.server.create("document", {
      docType: "RFC",
      product: "Vault",
      owners: [TEST_USER_2_EMAIL],
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

    await visit("/results?scope=Docs");

    assert.dom(RESULTS_MATCH_COUNT).containsText(`${totalDocCount}`);
    assert.dom(DOC_LINK).exists({ count: totalDocCount });

    assert
      .dom(ACTIVE_FILTER_LIST)
      .doesNotExist("the active filters section is hidden");

    // Filter by owner

    await fillIn(OWNERS_INPUT, TEST_USER_EMAIL);
    await click(OWNER_MATCH);

    captureFacetElements();

    assert.dom(RESULTS_MATCH_COUNT).containsText(`${totalDocCount - 1}`);

    // Turn off owner filter

    await click(ACTIVE_FILTER_LINK);

    // Begin to filter by docType

    await click(DOC_TYPE_FACET_DROPDOWN_TOGGLE);

    captureFacetElements();

    assert
      .dom(FACET_DROPDOWN_LINK)
      .exists({ count: 2 }, "two docType facets are shown");

    assert.dom(firstFacet).containsText("FRD").containsText(`${frdCount}`);
    assert.dom(secondFacet).containsText("RFC").containsText(`${rfcCount}`);

    // Click the FRD filter

    await click(firstFacet as unknown as Element);

    assert.dom(RESULTS_MATCH_COUNT).containsText(`${frdCount}`);
    assert.dom(DOC_LINK).exists({ count: frdCount });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .containsText("FRD")
      .hasAttribute(
        "href",
        "/results?scope=Docs",
        "the filter is shown in the active filters section with the correct link to remove it",
      );

    assert
      .dom(CLEAR_ALL_FILTERS_LINK)
      .hasAttribute("href", "/results?scope=Docs");

    assert.dom(DOC_LINK).exists({ count: frdCount });

    // Open the product facet dropdown

    await click(PRODUCT_FACET_DROPDOWN_TOGGLE);

    captureFacetElements();

    assert
      .dom(FACET_DROPDOWN_LINK)
      .exists({ count: 2 }, "two product facets are shown");

    assert.dom(firstFacet).containsText("Terraform");
    assert.dom(secondFacet).containsText("Vault");

    // Click the Terraform filter

    await click(firstFacet as unknown as Element);

    assert.dom(RESULTS_MATCH_COUNT).containsText("1");
    assert.dom(DOC_LINK).exists({ count: 1 });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .exists({ count: 2 }, "two active filters are shown");

    // Confirm that the active filter tags have the correct hrefs

    assert
      .dom(ACTIVE_FILTER_LINK)
      .containsText("FRD")
      .hasAttribute(
        "href",
        "/results?product=%5B%22Terraform%22%5D&scope=Docs",
        "correct href to remove the filter",
      );

    const secondFilter = findAll(ACTIVE_FILTER_LINK)[1];

    assert
      .dom(secondFilter)
      .containsText("Terraform")
      .hasAttribute(
        "href",
        "/results?docType=%5B%22FRD%22%5D&scope=Docs",
        "correct href to remove the filter",
      );

    // Turn off the original docType filter

    await click(ACTIVE_FILTER_LINK);

    assert.dom(RESULTS_MATCH_COUNT).containsText(`${terraformDocCount}`);
    assert.dom(DOC_LINK).exists({ count: terraformDocCount });

    assert
      .dom(ACTIVE_FILTER_LINK)
      .exists({ count: 1 }, "only the product filter is active")
      .hasAttribute(
        "href",
        "/results?scope=Docs",
        "the active filter link is correct",
      );

    // Turn off all filters

    await click(CLEAR_ALL_FILTERS_LINK);

    assert.dom(DOC_LINK).exists({ count: totalDocCount });

    assert
      .dom(ACTIVE_FILTER_LIST)
      .doesNotExist("the active filters section is hidden");

    // visit a URL with no results
    await visit("/results?q=ZZZZZZZZZ&scope=Docs");

    assert.dom(FACET_TOGGLE).exists({ count: 3 });

    const facetToggles = findAll(FACET_TOGGLE);

    facetToggles.forEach((toggle) => {
      assert.dom(toggle).isDisabled();
    });

    assert.dom(RESULTS_MATCH_COUNT).containsText("0 matches");
  });

  test("the search input displays the route query on load", async function (this: Context, assert) {
    const query = "foo";

    await visit(`/results?q=${query}`);

    assert.dom(GLOBAL_SEARCH_INPUT).hasValue(query);
  });

  test("search filters reset when the query changes (docs)", async function (this: Context, assert) {
    const title = "baz";

    this.server.create("document", {
      title,
    });

    const initialURL =
      "/results?scope=Docs&q=bar&page=2&status=%5B%22Approved%22%5D";

    await visit(initialURL);

    assert.equal(currentURL(), initialURL);

    await fillIn(GLOBAL_SEARCH_INPUT, title);
    await click(VIEW_ALL_RESULTS_LINK);

    assert.equal(
      currentURL(),
      `/results?q=${title}`,
      "the query is updated and the non-query filters are removed",
    );
  });
});
