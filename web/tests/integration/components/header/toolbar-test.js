import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

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

  test("it renders ", async function (assert) {
    this.set("facets", FACETS);
    this.set("sortControlIsHidden", false);

    await render(hbs`
      <Header::Toolbar
        @facets={{this.facets}}
        @sortControlIsHidden={{this.sortControlIsHidden}}
      />
    `);

    assert.dom(".facets").exists("Facets are shown when provided");
    assert
      .dom(".sort-by-dropdown")
      .exists("Sort-by dropdown is shown with facets unless explicitly hidden");

    assert.dom(".facets [data-test-facet-dropdown-trigger]").exists({ count: 4 });

    assert.dom(".sort-by-dropdown").exists({ count: 1 });
    assert.dom(".sort-by-dropdown").hasText("Sort: Newest");

    this.set("sortControlIsHidden", true);
    assert
      .dom(".sort-by-dropdown")
      .doesNotExist("Sort-by dropdown hides when sortByHidden is true");
  });
});
