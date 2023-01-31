import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | header/facet", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders a search input by default", async function (assert) {
    this.set("onClick", (facetName, facetValue) => {
      this.set("facetName", facetName);
      this.set("facetValue", facetValue);
      this.set("facets", { [facetValue]: { count: 4, selected: true } });
    });

    this.set("facetName", "unknown");
    this.set("facetValue", "unknown");

    this.set("facets", { RFC: { count: 4, selected: false } });

    await render(hbs`
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
        @onClick={{this.onClick}}
        @listPosition="left"
        class="test-facet"
      />
      <div class="name">{{this.facetName}}</div>
      <div class="value">{{this.facetValue}}</div>
    `);

    assert.dom(".test-facet").exists("it renders with a passed-in className");
    assert.dom(".name").hasText("unknown", "default facetName text is shown");
    assert.dom(".value").hasText("unknown", "default facetValue text is shown");
    assert.dom(".hds-disclosure__content").doesNotExist("facet list is hidden");

    await click("[data-test-facets-dropdown-toggle-button]");

    assert
      .dom(".hds-disclosure__content")
      .exists("facet list shows on toggleClick");
    assert.dom(".facet-interactive-item").hasText("RFC (4)");
    assert.dom(".flight-icon-square").exists();

    await click(".facet-interactive-item");

    assert
      .dom(".hds-disclosure__content")
      .doesNotExist("facet list hides on interactiveItemClick");
    assert.dom(".name").hasText("docType", "onClick action works");
    assert.dom(".value").hasText("RFC", "onClick action works");

    await click("[data-test-facets-dropdown-toggle-button]");

    assert.dom(".flight-icon-square").doesNotExist();
    assert
      .dom(".flight-icon-check-square-fill")
      .exists('selected facet has "check" icon');
  });
});
