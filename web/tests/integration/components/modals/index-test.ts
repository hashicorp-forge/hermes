import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import ModalAlertsService from "hermes/services/modal-alerts";

module("Integration | Component | modals", function (hooks) {
  setupRenderingTest(hooks);

  test("it conditionally renders modals", async function (assert) {
    let modalAlerts = this.owner.lookup(
      "service:modal-alerts"
    ) as ModalAlertsService;

    await render(hbs`{{! @glint-nocheck }}<Modals />`);

    assert.dom("dialog").doesNotExist();
    await modalAlerts.setActive.perform("docCreated");

    await rerender();
    assert.dom("dialog").exists("docCreated modal shown");
  });
});
