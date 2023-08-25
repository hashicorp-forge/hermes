import { TestContext, find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { FacetDropdownObjects } from "hermes/types/facets";
import { module, test } from "qunit";

interface HeaderFacetDropdownTestContext extends TestContext {
  facets: FacetDropdownObjects | null;
  label: string;
}

module("Integration | Component | header/facet-dropdown", function (hooks) {
  setupRenderingTest(hooks);
  hooks.beforeEach(function () {
    this.set("facets", null);
    this.set("label", "");
  });

  test("it renders the correct styles based on position", async function (this: HeaderFacetDropdownTestContext, assert) {
    await render<HeaderFacetDropdownTestContext>(
      hbs`
        <Header::FacetDropdown
          @facets={{this.facets}}
          @label={{this.label}}
          @position="left"
        />
        <Header::FacetDropdown
          @facets={{this.facets}}
          @label={{this.label}}
          @position="center"
        />
        <Header::FacetDropdown
          @facets={{this.facets}}
          @label={{this.label}}
          @position="right"
        />
      `
    );

    assert.dom("button").hasClass("rounded-r-none");
    assert.dom(find("button:nth-child(2)")).hasClass("border-l-0");
    assert.dom(find("button:nth-child(2)")).hasClass("rounded-none");
    assert.dom(find("button:nth-child(3)")).hasClass("rounded-l-none");
  });
});
