import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { TEST_USER_EMAIL } from "hermes/mirage/utils";
import { HermesDocument } from "hermes/types/document";

interface Context extends TestContext {
  document: HermesDocument;
  email: string;
}

module("Integration | Helper | has-rejected-doc", function (hooks) {
  setupRenderingTest(hooks);

  test("", async function (assert) {
    this.set("document", {
      owners: [TEST_USER_EMAIL],
      changesRequestedBy: [],
    });

    this.set("email", TEST_USER_EMAIL);

    await render<Context>(hbs`
      <div>
        {{#if (has-rejected-doc this.document this.email)}}
          Has rejected
        {{else}}
          Has not rejected
        {{/if}}
      </div>
    `);

    assert.dom("div").hasText("Has not rejected");

    this.set("document", {
      changesRequestedBy: [TEST_USER_EMAIL],
    });

    assert.dom("div").hasText("Has rejected");
  });
});
