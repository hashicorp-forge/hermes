import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
  find,
  render,
  triggerEvent,
  triggerKeyEvent,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { assert as emberAssert } from "@ember/debug";

module("Integration | Modifier | it dismisses as expected", function (hooks) {
  setupRenderingTest(hooks);

  // Replace this with your real tests.
  test("it renders", async function (assert) {
    let count = 0;

    this.set("dismiss", () => {
      count++;
    });

    await render(hbs`
      <div {{dismissible dismiss=this.dismiss related=this.related}}>
        Dismiss me
      </div>

      <p>Related content</p>
      <span>Unrelated content</span>
    `);

    // Must be set after the component is rendered
    this.set("related", find("p"));

    await click("span");
    assert.equal(count, 1, 'dismisses when clicking "unrelated" content');

    await click("p");
    assert.equal(count, 1, "does not dismiss when clicking related content");

    await triggerKeyEvent(document, "keydown", "Escape");
    assert.equal(count, 2, "dismisses when keying escape");

    await triggerEvent(document, "focusin");
    assert.equal(count, 3, "dismisses when focusing outside the component");

    this.set("related", [find("p"), find("span")]);

    await click("span");
    await click("p");

    assert.equal(count, 3, "you can pass an array of related elements");
  });

  test("it special-handles search inputs", async function (assert) {
    let count = 0;

    this.set("dismiss", () => {
      count++;
    });

    this.set("inputValue", "");

    await render(hbs`
      <input
        type="search"
        value={{this.inputValue}}
        {{dismissible dismiss=this.dismiss}}
      />
    `);
    let input = find("input");

    emberAssert("input is an input element", input instanceof HTMLInputElement);

    await fillIn(input, "foo");

    await triggerKeyEvent(input, "keydown", "Escape");

    assert.equal(
      count,
      0,
      "does not dismiss when keying escape on an active search input"
    );

    // Normally the browser will clear the input when the escape key is pressed
    // But we need to do it manually for the test
    await fillIn(input, "");

    await triggerKeyEvent(input, "keydown", "Escape");

    assert.equal(
      count,
      1,
      "dismisses when keying escape on an empty search input"
    );
  });
});
