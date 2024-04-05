import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";

interface TimeAgoTestContext extends TestContext {
  fiveSecondsAgo: number;
  twoYearsAgo: number;
  sevenMonthsAgo: number;
}

module("Integration | Helper | time-ago", function (hooks) {
  setupRenderingTest(hooks);

  test("it computes the time ago", async function (assert) {
    MockDate.set(DEFAULT_MOCK_DATE);
    const now = Date.now() / 1000;
    const fiveSecondsAgo = now - 5;
    const twoYearsAgo = now - 63072000;
    const sevenMonthsAgo = now - 18144000;

    this.set("fiveSecondsAgo", fiveSecondsAgo);
    this.set("twoYearsAgo", twoYearsAgo);
    this.set("sevenMonthsAgo", sevenMonthsAgo);

    await render<TimeAgoTestContext>(hbs`
      <div class="one">
        {{time-ago this.fiveSecondsAgo}}
      </div>
      <div class="two-a">
        {{time-ago this.twoYearsAgo}}
      </div>
      <div class="two-b">
        {{time-ago this.twoYearsAgo limitTo24Hours=true}}
      </div>
      <div class="three-a">
        {{time-ago this.sevenMonthsAgo}}
      </div>
      <div class="three-b">
        {{time-ago this.sevenMonthsAgo limitTo24Hours=true}}
      </div>
    `);

    assert.dom(".one").hasText("5 seconds ago");
    assert.dom(".two-a").hasText("2 years ago");
    assert.dom(".two-b").hasText("1 Jan. 1998");
    assert.dom(".three-a").hasText("7 months ago");
    assert.dom(".three-b").hasText("5 Jun. 1999");

    MockDate.reset();
  });
});
