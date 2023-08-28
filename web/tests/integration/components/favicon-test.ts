import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | favicon", function (hooks) {
  setupRenderingTest(hooks);

  test("it appends the passed-in URL to the google favicon path", async function (assert) {
    await render(hbs`
      <Favicon @url="https://hashicorp.com"/>
    `);

    assert
      .dom("[data-test-favicon]")
      .hasAttribute(
        "src",
        "https://www.google.com/s2/favicons?domain=https://hashicorp.com&sz=32"
      );
  });
});
