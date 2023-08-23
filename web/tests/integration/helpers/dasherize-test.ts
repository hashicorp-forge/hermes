import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface DasherizeHelperTestContext extends TestContext {
  query?: Record<string, unknown>;
}

module("Integration | Helper | dasherize", function (hooks) {
  setupRenderingTest(hooks);

  test("it dasherizes strings", async function (this: DasherizeHelperTestContext, assert) {
    await render(hbs`
      <div class="one">{{dasherize "Foo Bar"}}</div>
      <div class="two">{{dasherize "fooBar"}}</div>
      <div class="three">{{dasherize "foo_bar"}}</div>
      <div class="four">{{dasherize undefined}}</div>
    `);

    assert.equal(find(".one")?.textContent?.trim(), "foo-bar");
    assert.equal(find(".two")?.textContent?.trim(), "foo-bar");
    assert.equal(find(".three")?.textContent?.trim(), "foo-bar");
    assert.equal(find(".four")?.textContent?.trim(), "");
  });
});
