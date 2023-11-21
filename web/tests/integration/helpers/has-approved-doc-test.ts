import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { TEST_USER_EMAIL } from "hermes/utils/mirage-utils";

module("Integration | Helper | has-approved-doc", function (hooks) {
  setupRenderingTest(hooks);

  test("", async function (assert) {
    this.set("document", {
      approvedBy: [],
    });

    const email = TEST_USER_EMAIL;
    this.set("email", email);

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
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
