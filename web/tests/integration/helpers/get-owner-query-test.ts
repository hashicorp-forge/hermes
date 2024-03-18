import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { TEST_USER_EMAIL } from "hermes/mirage/utils";

interface Context extends TestContext {
  email?: string;
}

module("Integration | Helper | get-owner-query", function (hooks) {
  setupRenderingTest(hooks);

  test("it generates the correct href", async function (this: Context, assert) {
    const email = TEST_USER_EMAIL;
    this.set("email", email);

    await render<Context>(hbs`
      <LinkTo
        @route="authenticated.documents"
        @query={{get-owner-query this.email}}
      >
        Click
      </LinkTo>
    `);

    const encodedEmail = encodeURIComponent(email);

    assert
      .dom("a")
      .hasAttribute("href", `/documents?owners=%5B%22${encodedEmail}%22%5D`);

    this.set("email", undefined);

    assert.dom("a").hasAttribute("href", "/documents");
  });
});
