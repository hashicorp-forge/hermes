import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | results", function (hooks) {
  setupRenderingTest(hooks);

  test("it conditionally shows a product link", async function (assert) {
    let hits = [{ product: "Consul" }, { product: "Terraform" }];

    this.set("results", {
      page: 0,
      hits: hits,
    });

    this.set("query", "teRRaForM");

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Results::Index @results={{this.results}} @query={{this.query}} />
    `);

    assert
      .dom("[data-test-results-product-link]")
      .exists(
        "Product link is shown when query matches a product name of the first 12 hits"
      );

    assert
      .dom(".hds-badge__text")
      .hasText(
        "Terraform",
        "Product name is shown in badge, properly capitalized"
      );
    assert
      .dom("[data-test-results-product-link] a")
      .hasText("View all Terraform documents")
      .hasAttribute("href", "/all?product=%5B%22Terraform%22%5D");

    this.set("query", "engineering");
    assert
      .dom("[data-test-results-product-link]")
      .doesNotExist(
        "only shown when query matches a product name of the first 12 hits"
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
