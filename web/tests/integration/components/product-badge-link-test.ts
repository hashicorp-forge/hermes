import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface ProductBadgeLinkComponentTestContext extends TestContext {}

module("Integration | Component | product-badge-link", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders with the correct attributes", async function (this: ProductBadgeLinkComponentTestContext, assert) {
    await render<ProductBadgeLinkComponentTestContext>(hbs`
      <ProductBadgeLink class="foo" @productArea="Cloud Platform" />
      <ProductBadgeLink class="bar" @productArea="Terraform" />
      <ProductBadgeLink class="baz" />
    `);

    assert
      .dom(".foo")
      .hasAttribute("href", "/documents?product=%5B%22Cloud%20Platform%22%5D")
      .hasText("HCP");

    assert
      .dom(".bar")
      .hasAttribute("href", "/documents?product=%5B%22Terraform%22%5D")
      .hasText("Terraform");

    assert.dom(".baz").hasAttribute("href", "/documents").hasText("Unknown");
  });
});
