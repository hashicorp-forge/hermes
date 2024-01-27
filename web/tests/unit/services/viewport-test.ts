import { setupTest } from "ember-qunit";
import ViewportService from "hermes/services/viewport";
import { module, test } from "qunit";
import window from "ember-window-mock";

module("Unit | Service | viewport", function (hooks) {
  setupTest(hooks);

  test("it returns the width of the viewport", function (assert) {
    const viewport = this.owner.lookup("service:viewport") as ViewportService;

    assert.equal(
      viewport.width,
      window.innerWidth,
      "viewport width is correct",
    );

    const randomWidth = Math.floor(Math.random() * 1000);

    viewport.width = randomWidth;

    assert.equal(
      viewport.width,
      randomWidth,
      "width property updates as expected",
    );
  });
});
