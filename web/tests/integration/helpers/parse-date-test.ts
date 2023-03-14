import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import MockDate from "mockdate";

module("Integration | Helper | parse-date", function (hooks) {
  setupRenderingTest(hooks);

  // Make sure the date is always the same
  MockDate.set("2000-01-01T06:00:00.000-07:00");

  test("", async function (assert) {
    await render(hbs`
      <div class="valid">
        {{parse-date 628021800000}}
      </div>
      <div class="long">
        {{parse-date 628021800000 "long"}}
      </div>
      <div class="invalid">
        {{or (parse-date undefined) "Unknown"}}
      </div>
    `);

    assert
      .dom(".valid")
      .hasText("25 Nov. 1989", "A valid date renders correctly");
    assert
      .dom(".long")
      .hasText("25 November 1989", "The long format renders correctly");
    assert.dom(".invalid").hasText("Unknown", "An invalid date returns null");

    MockDate.reset();
  });
});
