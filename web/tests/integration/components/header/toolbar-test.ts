import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  TestContext,
  click,
  findAll,
  render,
  rerender,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetDropdownGroups, FacetDropdownObjects } from "hermes/types/facets";
import ActiveFiltersService from "hermes/services/active-filters";

// Filter buttons
const FACET_DROPDOWN_TOGGLE = "[data-test-facet-dropdown-toggle]";
const DOC_TYPE_TOGGLE = `${FACET_DROPDOWN_TOGGLE}[data-test-facet="type"]`;
const STATUS_TOGGLE = `${FACET_DROPDOWN_TOGGLE}[data-test-facet="status"]`;
const PRODUCT_TOGGLE = `${FACET_DROPDOWN_TOGGLE}[data-test-facet="product/area"]`;
const OWNER_TOGGLE = `${FACET_DROPDOWN_TOGGLE}[data-test-facet="owner"]`;

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
      findAll("[data-test-x-dropdown-list-item-value]")?.map(
        (el) => el.textContent?.trim(),
      ),
      ["Approved", "In-Review", "In Review", "Obsolete", "WIP"],
      "Unsupported statuses are filtered out",
    );
  });

  test("it renders undefined facets disabled", async function (assert) {
    this.set("facets", { ...FACETS, status: undefined });

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    assert.dom(DOC_TYPE_TOGGLE).isNotDisabled();
    assert.dom(PRODUCT_TOGGLE).isNotDisabled();
    assert.dom(OWNER_TOGGLE).isNotDisabled();

    assert.dom(STATUS_TOGGLE).isDisabled("the empty status facet is disabled");
  });
});
