import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | get-product-label", function (hooks) {
  setupRenderingTest(hooks);

  test("it works as expected", async function (assert) {
    await render(hbs`
      <div data-test-one>{{get-product-label "Terraform"}}</div>
      <div data-test-two>{{get-product-label "Cloud Platform"}}</div>
      <div data-test-three>{{get-product-label undefined}}</div>
    `);

    assert.dom("[data-test-one]").hasText("Terraform");
    assert.dom("[data-test-two]").hasText("HCP");
    assert.dom("[data-test-three]").hasText("Unknown");
  });
});
