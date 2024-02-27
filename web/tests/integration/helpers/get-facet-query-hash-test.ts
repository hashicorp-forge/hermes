import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import ActiveFiltersService from "hermes/services/active-filters";
import { FacetName } from "hermes/components/header/toolbar";

interface Context extends TestContext {
  type: FacetName;
  status: FacetName;
  product: FacetName;
  ownerFacet: FacetName;
}

module("Integration | Helper | get-facet-query-hash", function (hooks) {
  setupRenderingTest(hooks);

  test("it generates the correct href", async function (this: Context, assert) {
    const activeFiltersService = this.owner.lookup(
      "service:active-filters",
    ) as ActiveFiltersService;

    activeFiltersService.index = {
      docType: ["bar"],
      owners: [],
      product: [],
      status: [],
    };

    this.set("type", FacetName.DocType);
    this.set("status", FacetName.Status);
    this.set("product", FacetName.Product);
    this.set("ownerFacet", FacetName.Owners);

    await render<Context>(hbs`
      <LinkTo
        @route="authenticated.documents"
        @query={{get-facet-query-hash this.type "foo" false}}
      />

      <LinkTo
        @route="authenticated.documents"
        @query={{get-facet-query-hash this.type "bar" true}}
      />

      <LinkTo
        @route="authenticated.documents"
        @query={{get-facet-query-hash this.status "foo" false}}
      />

      <LinkTo
        @route="authenticated.documents"
        @query={{get-facet-query-hash this.product "foo" false}}
      />

      <LinkTo
        @route="authenticated.documents"
        @query={{get-facet-query-hash this.ownerFacet "foo" false}}
      />
    `);

    assert
      .dom("a:nth-of-type(1)")
      .hasAttribute(
        "href",
        `/documents?${FacetName.DocType}=%5B%22bar%22%2C%22foo%22%5D`,
        "Link would add a filter to the query hash; Type facetName is properly translated",
      );

    assert
      .dom("a:nth-of-type(2)")
      .hasAttribute(
        "href",
        "/documents",
        "Link would remove a filter from the query hash",
      );

    assert
      .dom("a:nth-of-type(3)")
      .hasAttribute(
        "href",
        `/documents?${FacetName.DocType}=%5B%22bar%22%5D&${FacetName.Status}=%5B%22foo%22%5D`,
        "Status facetName is properly translated",
      );

    assert
      .dom("a:nth-of-type(4)")
      .hasAttribute(
        "href",
        `/documents?${FacetName.DocType}=%5B%22bar%22%5D&${FacetName.Product}=%5B%22foo%22%5D`,
        "Product/Area facetName is properly translated",
      );

    assert
      .dom("a:nth-of-type(5)")
      .hasAttribute(
        "href",
        `/documents?${FacetName.DocType}=%5B%22bar%22%5D&${FacetName.Owners}=%5B%22foo%22%5D`,
        "Owner facetName is properly translated",
      );
  });
});
