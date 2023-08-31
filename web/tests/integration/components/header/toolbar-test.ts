import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetDropdownGroups, FacetDropdownObjects } from "hermes/types/facets";

const FACETS = {
  docType: {
    RFC: { count: 1, isSelected: false },
  },
  owners: {
    ["mishra@hashicorp.com"]: { count: 8, isSelected: false },
  },
  product: { Labs: { count: 9, isSelected: false } },
  status: {
    Approved: { count: 3, isSelected: false },
  },
};

interface ToolbarTestContext extends TestContext {
  facets: FacetDropdownGroups;
}

module("Integration | Component | header/toolbar", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders a search input by default", async function (assert) {
    await render(hbs`
      <Header::Toolbar />
    `);

    assert.dom(".facets").doesNotExist("Facets are hidden unless provided");
  });

  test("it renders facets when provided", async function (this: ToolbarTestContext, assert) {
    this.set("facets", FACETS);

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar
        @facets={{this.facets}}
      />
    `);

    assert.dom(".facets").exists();

    assert
      .dom(".facets [data-test-facet-dropdown-trigger]")
      .exists({ count: 4 });
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
      statusFacets[status] = { count: 1, isSelected: false };
    });

    this.set("facets", { status: statusFacets });

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    await click("[data-test-facet-dropdown-trigger='Status']");

    assert.deepEqual(
      findAll(".x-dropdown-list-item-value")?.map((el) =>
        el.textContent?.trim()
      ),
      ["Approved", "In-Review", "In Review", "Obsolete", "WIP"],
      "Unsupported statuses are filtered out"
    );
  });

  test("it conditionally renders the status facet disabled", async function (assert) {
    this.set("facets", { status: {} });
    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);
    assert
      .dom("[data-test-facet-dropdown-trigger='Status']")
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
