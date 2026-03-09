import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | external-link", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders an external link", async function (assert) {
    await render(hbs`
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

  test("it can render with an icon", async function (assert) {
    await render(hbs`
      <ExternalLink class="foo" href="" @iconIsShown={{true}} />
      <ExternalLink class="bar" href="" />
  `);

    const fooClasslist = document.querySelector(".foo")?.classList;
    assert.true(fooClasslist?.contains("flex"));
    assert.dom(".foo svg").exists();

    const barClasslist = document.querySelector(".bar")?.classList;
    assert.false(barClasslist?.contains("flex"));
    assert.dom(".bar svg").doesNotExist();
  });
});
