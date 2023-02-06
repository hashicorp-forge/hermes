import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import RouterService from "@ember/routing/router-service";

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

  test("the sortBy can be changed", async function (assert) {
    this.set("facets", FACETS);
    this.set("sortControlIsHidden", false);

    await render(hbs`
      <Header::Toolbar
        @facets={{this.facets}}
        @sortControlIsHidden={{this.sortControlIsHidden}}
      />
    `);

    assert.dom("[data-test-sort-by-button]").hasText("Sort: Newest");

    await click("[data-test-sort-by-button]");

    await click(".hds-dropdown-list-item:nth-child(2) button");
    // Need to mock the routerService here
    await this.pauseTest();

    assert.dom(".sort-by-dropdown").hasText("Sort: Oldest");

    const queryParams = (this.owner.lookup("service:router") as RouterService)
      .currentRoute.queryParams;
    assert.equal(queryParams["sortBy"], "dateAsc");
  });
});
