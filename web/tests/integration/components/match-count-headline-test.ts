import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, TestContext } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface Context extends TestContext {
  count: number;
}

module("Integration | Component | match-count-headline", function (hooks) {
  setupRenderingTest(hooks);

  test("it uses the correct grammar", async function (assert) {
    this.set("count", 0);

    await render<Context>(hbs`
      <MatchCountHeadline @count={{this.count}} />
    `);

    assert.dom("h1").hasText("0 matches");

    this.set("count", 1);

    assert.dom("h1").hasText("1 match");
  });
});
