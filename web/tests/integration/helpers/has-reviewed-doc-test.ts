import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | has-reviewed-doc", function (hooks) {
  setupRenderingTest(hooks);

  test("", async function (assert) {
    this.set("document", {
      reviewedBy: [],
    });

    const email = "person@example.com";
    this.set("email", email);

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <div>
        {{#if (has-reviewed-doc this.document this.email)}}
          Has reviewed
        {{else}}
          Has not reviewed
        {{/if}}
      </div>
    `);

    assert.dom("div").hasText("Has not reviewed");

    this.set("document", {
      reviewedBy: [email],
    });

    assert.dom("div").hasText("Has reviewed");
  });
});
