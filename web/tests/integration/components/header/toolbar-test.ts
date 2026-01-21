import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetDropdownGroups, FacetDropdownObjects } from "hermes/types/facets";
import { FacetLabel } from "hermes/helpers/get-facet-label";
import { SearchScope } from "hermes/routes/authenticated/results";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import {
  authenticateTestUser,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
} from "hermes/mirage/utils";

// Filter buttons
const TOGGLE = "[data-test-facet-dropdown-toggle]";
const DOC_TYPE_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.DocType}"]`;
const STATUS_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.Status}"]`;
const PRODUCT_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.Product}"]`;
const OWNERS_INPUT = `[data-test-search-owners-input]`;
const DROPDOWN_ITEM = "[data-test-facet-dropdown-link]";
const POPOVER = "[data-test-facet-dropdown-popover]";
const CHECK = "[data-test-x-dropdown-list-checkable-item-check]";
const LIST_ITEM_VALUE = "[data-test-x-dropdown-list-item-value]";
const OWNER_MATCH = "[data-test-x-dropdown-list-item-link-to]";

const FACETS = {
  docType: {
    RFC: { count: 1, isSelected: false },
  },
  product: { Labs: { count: 9, isSelected: false } },
  status: {
    Approved: { count: 3, isSelected: false },
  },
  owners: {
    ["mishra@hashicorp.com"]: { count: 8, isSelected: false },
  },
};

interface ToolbarTestContext extends MirageTestContext {
  facets: FacetDropdownGroups;
  scope: SearchScope;
}

module("Integration | Component | header/toolbar", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

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

    await click(STATUS_TOGGLE);

    const docFilters = [
      "Approved",
      "In Review",
      "In-Review",
      "Obsolete",
      "WIP",
    ];

    assert.deepEqual(
      findAll(LIST_ITEM_VALUE)?.map((el) => el.textContent?.trim()),
      docFilters,
      "Unsupported statuses are filtered out",
    );
  });

  test("undefined statuses are hidden", async function (this: ToolbarTestContext, assert) {
    this.set("facets", { ...FACETS, status: undefined });

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    assert.dom(DOC_TYPE_TOGGLE).exists();
    assert.dom(PRODUCT_TOGGLE).exists();
    assert.dom(OWNERS_INPUT).exists();

    assert.dom(STATUS_TOGGLE).doesNotExist("the empty status facet is hidden");
  });

  test("the order of the facets is correct", async function (this: ToolbarTestContext, assert) {
    this.set("facets", FACETS);

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    assert.deepEqual(
      findAll(TOGGLE)?.map((el) => el.textContent?.trim()),
      [FacetLabel.DocType, FacetLabel.Status, FacetLabel.Product],
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

    assert.dom(firstItem).containsText("PRD").containsText("30");
    assert.dom(`${firstItem} ${CHECK}`).hasClass("visible");

    assert.dom(secondItem).containsText("RFC").containsText("1");
    assert.dom(`${secondItem} ${CHECK}`).hasClass("invisible");
  });

  test("owners can be searched", async function (this: ToolbarTestContext, assert) {
    authenticateTestUser(this);

    this.server.create("document", {
      status: "Approved",
    });

    this.set("facets", FACETS);

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    await fillIn(OWNERS_INPUT, TEST_USER_EMAIL);

    assert
      .dom(OWNER_MATCH)
      .containsText(TEST_USER_NAME, "the owner's name is displayed");
  });

  test("owners are searched via search service and the google people api", async function (this: ToolbarTestContext, assert) {
    this.server.create("google/person", {
      names: [{ displayName: "Mishra" }],
      emailAddresses: [{ value: "mishra@hashicorp.com" }],
    });

    this.server.create("google/person", {
      names: [{ displayName: "Michelle" }],
      emailAddresses: [{ value: "michelle@hashicorp.com" }],
    });

    this.server.create("document", {
      status: "Approved",
      owners: ["michelle@hashicorp.com"],
    });

    this.set("facets", FACETS);

    await render<ToolbarTestContext>(hbs`
      <Header::Toolbar @facets={{this.facets}} />
    `);

    await fillIn(OWNERS_INPUT, "mi");

    assert
      .dom(OWNER_MATCH)
      .exists(
        { count: 2 },
        "both people are displayed even though only one is a doc owner; the duplicate entry is filtered out",
      );
  });
});
