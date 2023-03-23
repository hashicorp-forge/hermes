import htmlElement from "hermes/utils/html-element";
import { module, test } from "qunit";

module("Unit | Utility | html-element", function () {
  test("it asserts and returns valid html elements", function (assert) {
    const div = document.createElement("div");
    const button = document.createElement("button");

    div.classList.add("html-element-test-div");
    button.classList.add("html-element-test-button");

    document.body.appendChild(div);
    document.body.appendChild(button);

    assert.true(htmlElement(".html-element-test-div") instanceof HTMLElement);
    assert.true(
      htmlElement(".html-element-test-button") instanceof HTMLElement
    );

    assert.throws(() => {
      htmlElement(".hope-for-the-future");
    }, "throws an error when an element isn't found");
  });
});
