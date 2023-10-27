import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import ProductAreasService from "hermes/services/product-areas";
import { module, test } from "qunit";

const AVATAR = "[data-test-product-avatar]";
const ICON = ".flight-icon";

interface ProductAvatarTestContext extends TestContext {
  product: string;
}

module("Integration | Component | product/avatar", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders the product icon", async function (this: ProductAvatarTestContext, assert) {
    this.set("product", "Terraform");

    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar
        @product={{this.product}}
       />
    `);

    assert.dom(AVATAR).hasClass("terraform");
    assert.dom(ICON).hasAttribute("data-test-icon", "terraform");

    this.set("product", "Vault");

    assert.dom(AVATAR).hasClass("vault");
    assert.dom(ICON).hasAttribute("data-test-icon", "vault");

    // expect an error if the product is not found
    assert.throws(() => {
      this.set("product", "foo");
    });
  });

  test("it renders at different sizes", async function (this: ProductAvatarTestContext, assert) {
    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar class="default" @product="Terraform" />
      <Product::Avatar class="small" @product="Terraform" @size="small" />
      <Product::Avatar class="medium" @product="Terraform" @size="medium" />
      <Product::Avatar class="large" @product="Terraform" @size="large" />
    `);

    assert.dom(".default").hasClass("small");
    assert.dom(".small").hasClass("small");
    assert.dom(".medium").hasClass("medium");
    assert.dom(".large").hasClass("large");
  });
});
