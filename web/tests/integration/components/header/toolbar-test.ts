import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, find, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetDropdownObjects } from "hermes/types/facets";
import RouterService from "@ember/routing/router-service";
import { SortByLabel } from "hermes/components/header/toolbar";

const FACETS = {
  docType: {
    RFC: { count: 1, selected: false },
  },
  owners: {
    ["mishra@hashicorp.com"]: { count: 8, selected: false },
  },
  product: { Labs: { count: 9, selected: false } },
  status: {
    Approved: { count: 3, selected: false },
  },
};

module("Integration | Component | header/toolbar", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders a search input by default", async function (assert) {
    await render(hbs`
      <Header::Toolbar />
    `);

    assert.dom(".facets").doesNotExist("Facets are hidden unless provided");
    assert
      .dom(".sort-by-dropdown")
      .doesNotExist("Sort-by dropdown is hidden unless facets are provided");
  });

  test("it renders facets when provided", async function (assert) {
    this.set("facets", FACETS);
    this.set("sortControlIsHidden", false);

    await render(hbs`
      <Header::Toolbar
        @facets={{this.facets}}
        @sortControlIsHidden={{this.sortControlIsHidden}}
      />
    `);

    assert.dom(".facets").exists();
    assert
      .dom("[data-test-facet-dropdown='sort']")
      .exists("Sort-by dropdown is shown with facets unless explicitly hidden");

    assert
      .dom(".facets [data-test-facet-dropdown-trigger]")
      .exists({ count: 4 });
    assert
      .dom('[data-test-facet-dropdown="sort"]')
      .exists({ count: 1 })
      .hasText(`Sort: ${SortByLabel.Newest}`);

    await click(
      `[data-test-facet-dropdown-trigger='Sort: ${SortByLabel.Newest}']`
    );
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(2)")
      .hasText("Oldest");

    this.set("sortControlIsHidden", true);
    assert
      .dom(".sort-by-dropdown")
      .doesNotExist("Sort-by dropdown hides when sortByHidden is true");
  });

  test("it handles status values correctly", async function (assert) {
    const STATUS_NAMES = [
      "Approved",
      "In-Review",
      "In Review",
      "Obsolete",
      "WIP",
      "Archived",
      "Draft",
      "Rejected",
      "Submitted",
    ];

    let statusFacets: FacetDropdownObjects = {};

    STATUS_NAMES.forEach((status) => {
      statusFacets[status] = { count: 1, selected: false };
    });

    this.set("facets", { status: statusFacets });

    await render(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    await click("[data-test-facet-dropdown-trigger='Status']");

    assert.deepEqual(
      findAll(
        "[data-test-facet-dropdown-menu-item] [data-test-facet-dropdown-list-item-value]"
      )?.map((el) => el.textContent?.trim()),
      ["Approved", "In-Review", "In Review", "Obsolete", "WIP"],
      "Unsupported statuses are filtered out"
    );
  });

  test("it conditionally renders the status facet disabled", async function (assert) {
    this.set("facets", { status: {} });
    await render(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);
    assert
      .dom("[data-test-facet-dropdown-trigger='Status']")
      .hasAttribute("disabled");
  });

  test("it conditionally disables the sort control", async function (assert) {
    this.set("facets", FACETS);
    await render(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    assert
      .dom(`[data-test-facet-dropdown-trigger='Sort: ${SortByLabel.Newest}']`)
      .doesNotHaveAttribute("disabled");
    this.set("facets", {});

    assert
      .dom(`[data-test-facet-dropdown-trigger='Sort: ${SortByLabel.Newest}']`)
      .hasAttribute("disabled");
  });

  /**
   * Waiting for acceptance tests to be implemented
   */
  todo(
    "the owner facet is disabled on the 'my' and 'drafts' routes",
    async function (assert) {
      throw new Error("Will be implemented in an acceptance test");
    }
  );

  todo("the sort can be changed", async function (assert) {
    throw new Error("Will be implemented in an acceptance test");
  });
});
