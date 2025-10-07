import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import FlagsService from "hermes/services/flags";

module("Unit | Service | flags", function (hooks) {
  setupTest(hooks);

  test("it exists", function (assert) {
    const service = this.owner.lookup("service:flags") as FlagsService;
    assert.ok(service);
  });

  test("it has access to config service", function (assert) {
    const service = this.owner.lookup("service:flags") as FlagsService;
    assert.ok(service.configSvc, "configSvc is injected");
  });
});
