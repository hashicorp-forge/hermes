import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import ModalAlertsService, { ModalType } from "hermes/services/modal-alerts";
import { TestContext, waitUntil } from "@ember/test-helpers";

interface Context extends TestContext {
  modalAlerts: ModalAlertsService;
}

module("Unit | Service | modal-alerts", function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.set(
      "modalAlerts",
      this.owner.lookup("service:modal-alerts") as ModalAlertsService,
    );
  });

  test("can show or hide an active modal", async function (this: Context, assert) {
    assert.equal(this.modalAlerts.shown, null);

    this.modalAlerts.show(ModalType.DraftCreated);

    await waitUntil(() => this.modalAlerts.shown === ModalType.DraftCreated);

    this.modalAlerts.hide();

    assert.equal(this.modalAlerts.shown, null);
  });

  test("data can be included when showing a modal", async function (this: Context, assert) {
    assert.equal(this.modalAlerts.shown, null);

    this.modalAlerts.show(ModalType.DraftCreated, { id: "123" });

    await waitUntil(() => this.modalAlerts.shown === ModalType.DraftCreated);

    assert.deepEqual(this.modalAlerts.data, { id: "123" });

    this.modalAlerts.hideAndResetData();

    assert.equal(this.modalAlerts.shown, null);
  });
});
