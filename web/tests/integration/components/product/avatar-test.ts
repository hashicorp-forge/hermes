import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";
import { module, test } from "qunit";

const AVATAR = "[data-test-product-avatar]";
const ICON = ".flight-icon";
const ABBREVIATION = "[data-test-product-abbreviation]";

interface ProductAvatarTestContext extends MirageTestContext {
  product: string;
}

module("Integration | Component | product/avatar", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

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

  test("it renders background and text style for non-icon products", async function (this: ProductAvatarTestContext, assert) {
    this.server.create("product", {
      name: "Labs",
    });

    await setupProductIndex(this);

    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar class="default" @product="Labs" />
    `);

    await this.pauseTest();

    // assert that there's inline background and text styles
  });

  test("it conditionally shows a product icon", async function (this: ProductAvatarTestContext, assert) {
    this.server.create("product", {
      name: "Vault",
    });

    this.set("product", "Vault");

    await setupProductIndex(this);

    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar class="default" @product={{this.product}} />
    `);

    assert.dom(ICON).exists();

    this.set("product", "Labs");

    assert.dom(ICON).doesNotExist();
  });

  test("it conditionally renders a product abbreviation", async function (this: ProductAvatarTestContext, assert) {
    this.server.create("product", {
      name: "Vault",
    });

    this.server.create("product", {
      name: "Labs",
    });

    this.set("product", "Labs");

    await setupProductIndex(this);

    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar class="default" @product={{this.product}} />
    `);

    assert.dom(ABBREVIATION).exists();

    this.set("product", "Vault");

    assert.dom(ABBREVIATION).doesNotExist();
  });

  test("it renders a fallback icon if the product is not found", async function (this: ProductAvatarTestContext, assert) {
    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar class="default" @product="foo" />
    `);

    assert.dom(ICON).hasAttribute("data-test-icon", "file-txt?");
  });

  test("it renders an abbreviations up to 3 characters", async function (this: ProductAvatarTestContext, assert) {
    this.server.create("product", {
      name: "Labs",
      abbreviation: "LABS_TEAM",
    });

    this.server.create("product", {
      name: "Foo",
      abbreviation: "F",
    });

    this.server.create("product", {
      name: "Bar",
      abbreviation: "BA",
    });

    this.server.create("product", {
      name: "Baz",
      abbreviation: "BAZ",
    });

    this.set("product", "Labs");

    await setupProductIndex(this);

    await render<ProductAvatarTestContext>(hbs`
      <Product::Avatar class="default" @product={{this.product}} />
    `);

    assert
      .dom(ABBREVIATION)
      .hasText(
        "L",
        "it renders the first letter of  abbreviations more than 3 characters",
      );

    this.set("product", "Foo");

    assert
      .dom(ABBREVIATION)
      .hasText("F", "it renders one-character abbreviations");

    this.set("product", "Bar");

    assert
      .dom(ABBREVIATION)
      .hasText("BA", "it renders two-character abbreviations");

    this.set("product", "Baz");

    assert
      .dom(ABBREVIATION)
      .hasText("BAZ", "it renders three-character abbreviations");
  });
});
