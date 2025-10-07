import { settled } from "@ember/test-helpers";
import blinkElement from "hermes/utils/blink-element";
import { module, test } from "qunit";

module("Unit | Utility | blink-element", function () {
  test("it blinks an element", async function (assert) {
    const div = document.createElement("div");

    blinkElement(div);

    // Wait for all setTimeout callbacks to complete
    await settled();

    // After blinking twice (4 visibility toggles), element should be visible
    // Sequence: hidden (0) -> visible (1) -> hidden (2) -> visible (3)
    assert.strictEqual(
      div.style.visibility,
      "visible",
      "element is visible after blinking"
    );
  });
});
