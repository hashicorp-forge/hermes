import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import ProductAreasService from "hermes/services/product-areas";

interface ResultsIndexTestContext extends MirageTestContext {
  results: any;
  query: string;
}

module("Integration | Component | results", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: ResultsIndexTestContext) {
    const productAreasService = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    this.server.createList("product", 4);

    await productAreasService.fetch.perform();
  });

  test("it conditionally shows a product link", async function (this: ResultsIndexTestContext, assert) {
    let hits = [{ product: "Consul" }, { product: "Terraform" }];

    this.set("results", {
      page: 0,
      hits: hits,
    });

    this.set("query", "teRRaForM");

    await render<ResultsIndexTestContext>(hbs`
      <Results @results={{this.results}} @query={{this.query}} />
    `);

    assert
      .dom("[data-test-results-product-link]")
      .exists(
        "Product link is shown when query matches a product name of the first 12 hits",
      );

    assert
      .dom(".hds-badge__text")
      .hasText(
        "Terraform",
        "Product name is shown in badge, properly capitalized",
      );
    assert
      .dom("[data-test-results-product-link] a")
      .hasText("View all Terraform documents")
      .hasAttribute("href", "/documents?product=%5B%22Terraform%22%5D");

    this.set("query", "engineering");
    assert
      .dom("[data-test-results-product-link]")
      .doesNotExist(
        "only shown when query matches a product name of the first 12 hits",
      );

    this.set("query", "consul");
    assert.dom("[data-test-results-product-link]").exists();

    this.set("results", {
      page: 1,
      hits: hits,
    });

    assert
      .dom("[data-test-results-product-link]")
      .doesNotExist("only shown on first page of results");
  });
});
