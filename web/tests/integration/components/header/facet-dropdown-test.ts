import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, find, render, waitUntil } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

const FACETS = {
  one: {},
  two: {},
  three: {},
  four: {},
  five: {},
  six: {},
  seven: {},
  eight: {},
  nine: {},
  ten: {},
  eleven: {},
};

module("Integration | Component | header/facet-dropdown", function (hooks) {
  setupRenderingTest(hooks);

  test("it shows the first 10 results", async function (assert) {
    this.set("facets", FACETS);

    await render(hbs`
      <Header::FacetDropdown
        @facets={{this.facets}}
        @label="Type"
        @disabled={{false}}
        class="attributes"
      />
    `);

    assert.dom(".attributes").exists("it renders with the passed-in className");
    assert.dom("[data-test-facet-dropdown-toggle-button]").hasText("Type");
    assert.dom(".hds-disclosure__content").doesNotExist("facet list is hidden");

    await click("[data-test-facet-dropdown-toggle-button]");
    assert
      .dom(".hds-disclosure__content")
      .exists("facet list shows on toggleClick");
    assert.dom(".facet-interactive-item").exists({ count: 10 });
  });

  test("it closes on a delay", async function (assert) {
    this.set("facets", FACETS);

    await render(hbs`
      <Header::FacetDropdown
        @facets={{this.facets}}
        @label="Type"
        @disabled={{false}}
      />
    `);

    await click("[data-test-facet-dropdown-toggle-button]");
    let closePromise = click("[data-test-facet-dropdown-toggle-button]");
    assert.dom(".facet-interactive-item").exists({ count: 10 });

    await waitUntil(() => !find(".facet-interactive-item"), { timeout: 100 });
    await closePromise;
  });

  test("it can be disabled", async function (assert) {
    this.set("facets", FACETS);

    await render(hbs`
      <Header::FacetDropdown
        @facets={{this.facets}}
        @label="Type"
        @disabled={{true}}
      />
    `);

    assert
      .dom("[data-test-facet-dropdown-toggle-button]")
      .hasAttribute("disabled");
  });
});
