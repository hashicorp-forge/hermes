import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  TestContext,
  click,
  find,
  render,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import {
  FacetDropdownObjectDetails,
  FacetDropdownObjects,
} from "hermes/types/facets";

const FACET_OBJECT_DETAILS: FacetDropdownObjectDetails = {
  count: 1,
  selected: false,
};

const FACETS: FacetDropdownObjects = {
  one: FACET_OBJECT_DETAILS,
  two: FACET_OBJECT_DETAILS,
  three: FACET_OBJECT_DETAILS,
  four: FACET_OBJECT_DETAILS,
  five: FACET_OBJECT_DETAILS,
  six: FACET_OBJECT_DETAILS,
  seven: FACET_OBJECT_DETAILS,
  eight: FACET_OBJECT_DETAILS,
  nine: FACET_OBJECT_DETAILS,
  ten: FACET_OBJECT_DETAILS,
  eleven: FACET_OBJECT_DETAILS,
};

interface HeaderFacetDropdownTestContext extends TestContext {
  facets: FacetDropdownObjects;
}

module(
  "Integration | Component | header/facet-dropdown",
  function (this: HeaderFacetDropdownTestContext, hooks) {
    setupRenderingTest(hooks);

    test("it shows the first 10 results", async function (assert) {
      this.set("facets", FACETS);

      await render<HeaderFacetDropdownTestContext>(hbs`
      <Header::FacetDropdown
        @facets={{this.facets}}
        @label="Type"
        @disabled={{false}}
        class="attributes"
      />
    `);

      assert
        .dom(".attributes")
        .exists("it renders with the passed-in className");
      assert.dom("[data-test-facet-dropdown-toggle-button]").hasText("Type");
      assert
        .dom(".hds-disclosure__content")
        .doesNotExist("facet list is hidden");

      await click("[data-test-facet-dropdown-toggle-button]");
      assert
        .dom(".hds-disclosure__content")
        .exists("facet list shows on toggleClick");
      assert.dom(".facet-interactive-item").exists({ count: 10 });
    });

    test("it closes on a delay", async function (this: HeaderFacetDropdownTestContext, assert) {
      this.set("facets", FACETS);

      await render<HeaderFacetDropdownTestContext>(hbs`
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

    test("it can be disabled", async function (this: HeaderFacetDropdownTestContext, assert) {
      this.set("facets", FACETS);

      await render<HeaderFacetDropdownTestContext>(hbs`
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
  }
);
