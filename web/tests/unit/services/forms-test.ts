import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import FormsService from "hermes/services/forms";

module("Unit | Service | forms", function (hooks) {
  setupTest(hooks);

  test("the projectIsBeingCreated attribute works as expected", async function (assert) {
    const service = this.owner.lookup("service:forms") as FormsService;
    assert.equal(service.projectIsBeingCreated, false);

    service.projectIsBeingCreated = true;
    assert.equal(service.projectIsBeingCreated, true);
  });
});
