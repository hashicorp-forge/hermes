import { module, test, todo } from "qunit";
import { setupTest } from "ember-qunit";
import ModalAlertsService, { ModalType } from "hermes/services/modal-alerts";
import { waitFor, waitUntil } from "@ember/test-helpers";

module("Unit | Service | modal-alerts", function (hooks) {
  setupTest(hooks);

  test("can set or close an active modal", async function (assert) {
    const modalAlerts = this.owner.lookup(
      "service:modal-alerts",
    ) as ModalAlertsService;

    assert.equal(modalAlerts.activeModal, null);

    modalAlerts.setActive(ModalType.DraftCreated);

    await waitUntil(() => modalAlerts.activeModal === ModalType.DraftCreated);

    modalAlerts.close();

    assert.equal(modalAlerts.activeModal, null);
  });
});
