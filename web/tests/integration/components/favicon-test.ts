import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { find, render, waitFor } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FALLBACK_FAVICON, FAVICON } from "hermes/tests/helpers/selectors";

module("Integration | Component | favicon", function (hooks) {
  setupRenderingTest(hooks);

  test("it appends the passed-in URL to the google favicon path", async function (assert) {
    await render(hbs`
      <Favicon @url="https://hashicorp.com"/>
    `);

    assert
      .dom(FAVICON)
      .hasAttribute(
        "src",
        "https://www.google.com/s2/favicons?sz=64&domain=https://hashicorp.com"
      );
  });

  test("it shows a fallback icon when the favicon URL is invalid", async function (assert) {
    await render(hbs`
      <Favicon @url="-"/>
    `);

    assert.dom(FALLBACK_FAVICON).doesNotExist();

    find(FAVICON)?.dispatchEvent(new Event("error"));

    await waitFor(FALLBACK_FAVICON);

    assert.dom(FALLBACK_FAVICON).exists();
    assert.dom(FAVICON).doesNotExist();
  });
});
