import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import ActiveFiltersService from "hermes/services/active-filters";

module("Integration | Helper | get-facet-query-hash", function (hooks) {
  setupRenderingTest(hooks);

  test("", async function (assert) {
    const activeFiltersService = this.owner.lookup(
      "service:active-filters"
    ) as ActiveFiltersService;

    activeFiltersService.index = {
      docType: ["bar"],
      owners: [],
      product: [],
      team: [],
      project: [],
      status: [],
    };

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <LinkTo
        @route="authenticated.all"
        @query={{get-facet-query-hash "Type" "foo" false}}
      />

      <LinkTo
        @route="authenticated.all"
        @query={{get-facet-query-hash "Type" "bar" true}}
      />

      <LinkTo
        @route="authenticated.all"
        @query={{get-facet-query-hash "Status" "foo" false}}
      />

      <LinkTo
        @route="authenticated.all"
        @query={{get-facet-query-hash "BU" "foo" false}}
      />

      <LinkTo
        @route="authenticated.all"
        @query={{get-facet-query-hash "Owner" "foo" false}}
      />
    `);

    assert
      .dom("a:nth-of-type(1)")
      .hasAttribute(
        "href",
        "/all?docType=%5B%22bar%22%2C%22foo%22%5D",
        "Link would add a filter to the query hash; Type facetName is properly translated"
      );

    assert
      .dom("a:nth-of-type(2)")
      .hasAttribute(
        "href",
        "/all",
        "Link would remove a filter from the query hash"
      );

    assert
      .dom("a:nth-of-type(3)")
      .hasAttribute(
        "href",
        "/all?docType=%5B%22bar%22%5D&status=%5B%22foo%22%5D",
        "Status facetName is properly translated"
      );

    assert
      .dom("a:nth-of-type(4)")
      .hasAttribute(
        "href",
        "/all?docType=%5B%22bar%22%5D&product=%5B%22foo%22%5D",
        "BU facetName is properly translated"
      );

    assert
      .dom("a:nth-of-type(5)")
      .hasAttribute(
        "href",
        "/all?docType=%5B%22bar%22%5D&owners=%5B%22foo%22%5D",
        "Owner facetName is properly translated"
      );
  });
});
