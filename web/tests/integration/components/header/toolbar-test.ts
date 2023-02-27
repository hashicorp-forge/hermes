import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetDropdownGroups, FacetDropdownObjects } from "hermes/types/facets";

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

interface HeaderToolbarTestContext extends TestContext {
  facets?: FacetDropdownGroups;
  sortControlIsHidden?: boolean;
}

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

  test("it renders facets when provided", async function (this: HeaderToolbarTestContext, assert) {
    this.set("facets", FACETS);
    this.set("sortControlIsHidden", false);

    await render<HeaderToolbarTestContext>(hbs`
      <Header::Toolbar
        @facets={{this.facets}}
        @sortControlIsHidden={{this.sortControlIsHidden}}
      />
    `);

    assert.dom(".facets").exists();
    assert
      .dom(".sort-by-dropdown")
      .exists("Sort-by dropdown is shown with facets unless explicitly hidden");

    assert.dom(".facets .hds-dropdown").exists({ count: 4 });

    assert.dom(".sort-by-dropdown").exists({ count: 1 });
    assert.dom(".sort-by-dropdown").hasText("Sort: Newest");

    await click("[data-test-sort-by-button]");
    assert.dom(".hds-dropdown-list-item:nth-child(2)").hasText("Oldest");

    this.set("sortControlIsHidden", true);
    assert
      .dom(".sort-by-dropdown")
      .doesNotExist("Sort-by dropdown hides when sortByHidden is true");
  });

  test("it handles status values correctly", async function (this: HeaderToolbarTestContext, assert) {
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

    const STATUS_FACETS: FacetDropdownObjects = {};

    STATUS_NAMES.forEach((status) => {
      STATUS_FACETS[status] = { count: 1, selected: false };
    });

    this.set("facets", { status: STATUS_FACETS });

    await render<HeaderToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    await click("[data-test-facet-dropdown='status'] button");

    assert.deepEqual(
      findAll(".hds-dropdown-list-item")?.map((el) => el.textContent?.trim()),
      [
        "Approved (1)",
        "In-Review (1)",
        "In Review (1)",
        "Obsolete (1)",
        "WIP (1)",
      ]
    );

    this.set("facets", { status: {} });

    assert
      .dom("[data-test-facet-dropdown='status'] button")
      .hasAttribute("disabled");
  });

  test("it conditionally disables the sort control", async function (this: HeaderToolbarTestContext, assert) {
    this.set("facets", FACETS);
    await render<HeaderToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    assert.dom("[data-test-sort-by-button]").doesNotHaveAttribute("disabled");
    this.set("facets", {});

    assert.dom("[data-test-sort-by-button]").hasAttribute("disabled");
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
