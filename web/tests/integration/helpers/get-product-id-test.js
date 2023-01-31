import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | get-product-id", function (hooks) {
  setupRenderingTest(hooks);

  test("it returns the product ID if it exists", async function (assert) {
    await render(hbs`
      <div class="product">
        {{get-product-id "Cloud Platform"}}
      </div>

      {{#if (get-product-id "Not a product")}}
        <div class="non-product">
          This will not appear because the product name is not valid.
        </div>
      {{/if}}
    `);

    assert.dom('.product').hasText("hcp");
    assert.dom('.non-product').doesNotExist();
  });
});
