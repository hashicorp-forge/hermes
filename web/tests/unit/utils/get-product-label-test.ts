import getProductLabel from "hermes/utils/get-product-label";
import { module, test } from "qunit";

module("Unit | Utility | get-product-label", function () {
  test("it returns the correct label", function (assert) {
    assert.equal(getProductLabel("Terraform"), "Terraform");
    assert.equal(getProductLabel("Cloud Platform"), "HCP");
    assert.equal(getProductLabel(), "Unknown");
  });
});
