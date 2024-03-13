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
    assert.equal(this.modalAlerts.opened, null);

    this.modalAlerts.open(ModalType.DraftCreated);

    await waitUntil(() => this.modalAlerts.opened === ModalType.DraftCreated);

    this.modalAlerts.close();

    assert.equal(this.modalAlerts.opened, null);
  });

  test("data can be included when showing a modal", async function (this: Context, assert) {
    assert.equal(this.modalAlerts.opened, null);

    this.modalAlerts.open(ModalType.DraftCreated, { id: "123" });

    await waitUntil(() => this.modalAlerts.opened === ModalType.DraftCreated);

    assert.deepEqual(this.modalAlerts.data, { id: "123" });

    this.modalAlerts.close();

    assert.equal(this.modalAlerts.opened, null);
  });
});
