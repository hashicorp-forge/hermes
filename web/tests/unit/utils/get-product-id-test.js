import { module, test } from "qunit";
import getProductId from "hermes/utils/get-product-id";

module("Unit | Utility | get-product-id", function () {
  test("it returns the product ID if it exists", function (assert) {
    assert.equal(getProductId("Boundary"), "boundary");
    assert.equal(getProductId("Consul"), "consul");
    assert.equal(getProductId("Nomad"), "nomad");
    assert.equal(getProductId("Packer"), "packer");
    assert.equal(getProductId("Terraform"), "terraform");
    assert.equal(getProductId("Vagrant"), "vagrant");
    assert.equal(getProductId("Vault"), "vault");
    assert.equal(getProductId("WAYPOINT"), "waypoint");
    assert.equal(getProductId("Cloud Platform"), "hcp");
    assert.equal(getProductId("Not a product"), null);
  });
});
