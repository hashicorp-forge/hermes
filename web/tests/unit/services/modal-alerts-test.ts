import { module, test, todo } from "qunit";
import { setupTest } from "ember-qunit";
import ModalAlertsService from "hermes/services/modal-alerts";

module("Unit | Service | modal-alerts", function (hooks) {
  setupTest(hooks);

  test("can set or close an active modal", async function (assert) {
    const modalAlerts = this.owner.lookup(
      "service:modal-alerts",
    ) as ModalAlertsService;

    assert.equal(modalAlerts.activeModal, null);

    modalAlerts.setActive("draftCreated");
    assert.equal(modalAlerts.activeModal, "draftCreated");

    modalAlerts.close();

    assert.equal(modalAlerts.activeModal, null);
  });

  todo("can set an active modal with a delay", async function (assert) {
    assert.equal(true, false);
  });
});
