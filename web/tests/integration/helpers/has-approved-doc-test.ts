import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | has-approved-doc", function (hooks) {
  setupRenderingTest(hooks);

  test("", async function (assert) {
    this.set("document", {
      approvedBy: [],
    });

    const email = "person@example.com";
    this.set("email", email);

    await render(hbs`
      <div>
        {{#if (has-approved-doc this.document this.email)}}
          Has approved
        {{else}}
          Has not approved
        {{/if}}
      </div>
    `);

    assert.dom("div").hasText("Has not approved");

    this.set("document", {
      approvedBy: [email],
    });

    assert.dom("div").hasText("Has approved");
  });
});
