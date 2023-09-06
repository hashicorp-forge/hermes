import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import MockDate from "mockdate";

interface TimeAgoTestContext extends TestContext {
  fiveSecondsAgo: number;
  twoYearsAgo: number;
  sevenMonthsAgo: number;
}

module("Integration | Helper | time-ago", function (hooks) {
  setupRenderingTest(hooks);

  test("it computes the time ago", async function (assert) {
    MockDate.set("2000-01-01T06:00:00.000-07:00");
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;
    const sevenMonthsAgo = now - 18144000000;
    const twoYearsAgo = now - 63072000000;

    this.set("fiveSecondsAgo", fiveSecondsAgo);
    this.set("twoYearsAgo", twoYearsAgo);
    this.set("sevenMonthsAgo", sevenMonthsAgo);

    await render<TimeAgoTestContext>(hbs`
      <div class="one">
        {{time-ago this.fiveSecondsAgo}}
      </div>
      <div class="two">
        {{time-ago this.twoYearsAgo}}
      </div>
      <div class="three">
        {{time-ago this.sevenMonthsAgo}}
      </div>
    `);

    assert.dom(".one").hasText("5 seconds ago");
    assert.dom(".two").hasText("2 years ago");
    assert.dom(".three").hasText("7 months ago");

    MockDate.reset();
  });
});
