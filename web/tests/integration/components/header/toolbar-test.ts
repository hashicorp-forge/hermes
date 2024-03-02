import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetDropdownGroups, FacetDropdownObjects } from "hermes/types/facets";
import { FacetLabel } from "hermes/helpers/get-facet-label";
import { SearchScope } from "hermes/routes/authenticated/results";

// Filter buttons
const TOGGLE = "[data-test-facet-dropdown-toggle]";
const DOC_TYPE_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.DocType}"]`;
const STATUS_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.Status}"]`;
const PRODUCT_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.Product}"]`;
const OWNER_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.Owners}"]`;
const DROPDOWN_ITEM = "[data-test-facet-dropdown-link]";
const POPOVER = "[data-test-facet-dropdown-popover]";
const CHECK = "[data-test-x-dropdown-list-checkable-item-check]";

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
  scope: SearchScope;
}

module("Integration | Component | header/toolbar", function (hooks) {
  setupRenderingTest(hooks);

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
    this.set("scope", SearchScope.Docs);

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @scope={{this.scope}} @facets={{this.facets}} />
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

  test("the order of the facets is correct", async function (this: ToolbarTestContext, assert) {
    this.set("facets", FACETS);

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    assert.deepEqual(
      findAll(TOGGLE)?.map((el) => el.textContent?.trim()),
      [
        FacetLabel.DocType,
        FacetLabel.Status,
        FacetLabel.Product,
        FacetLabel.Owners,
      ],
      "The facets are in the correct order",
    );
  });

  test("the dropdown items are rendered correctly", async function (this: ToolbarTestContext, assert) {
    this.set("facets", {
      docType: {
        RFC: { count: 1, isSelected: false },
        PRD: { count: 30, isSelected: true },
      },
    });

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    await click(DOC_TYPE_TOGGLE);

    assert.dom(DROPDOWN_ITEM).exists({ count: 2 });

    const firstItem = `${POPOVER} li:nth-child(1)`;
    const secondItem = `${POPOVER} li:nth-child(2)`;

    assert.dom(firstItem).containsText("RFC").containsText("1");
    assert.dom(`${firstItem} ${CHECK}`).hasClass("invisible");

    assert.dom(secondItem).containsText("PRD").containsText("30");
    assert.dom(`${secondItem} ${CHECK}`).hasClass("visible");
  });
});
