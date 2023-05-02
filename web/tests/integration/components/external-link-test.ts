import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | external-link", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders an external link", async function (assert) {
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <ExternalLink href="https://hashicorp.com" class="font-bold">
        HashiCorp
      </ExternalLink>
    `);

    assert
      .dom("[data-test-external-link]")
      .hasText("HashiCorp")
      .hasClass("font-bold")
      .hasAttribute("href", "https://hashicorp.com")
      .hasAttribute("target", "_blank")
      .hasAttribute("rel", "noopener noreferrer");
  });
});
