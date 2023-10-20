import { waitUntil } from "@ember/test-helpers";
import blinkElement from "hermes/utils/blink-element";
import { module, test } from "qunit";

module("Unit | Utility | blink-element", function () {
  test("it blinks an element", async function (assert) {
    assert.expect(0);

    const div = document.createElement("div");

    blinkElement(div);

    await waitUntil(() => div.style.visibility === "hidden");
    await waitUntil(() => div.style.visibility === "visible");
    await waitUntil(() => div.style.visibility === "hidden");
    await waitUntil(() => div.style.visibility === "visible");
  });
});
