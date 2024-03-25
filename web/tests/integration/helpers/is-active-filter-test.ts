import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render, rerender } from "@ember/test-helpers";
import ActiveFiltersService from "hermes/services/active-filters";
import { FacetName } from "hermes/components/header/toolbar";
import { hbs } from "ember-cli-htmlbars";

interface Context extends TestContext {
  docType: string;
}

module("Integration | Helper | is-active-filter", function (hooks) {
  setupRenderingTest(hooks);

  test("it returns whether a string is an active filter", async function (this: Context, assert) {
    const docType = "PRFAQ";

    this.set("docType", docType);

    const activeFilters = this.owner.lookup(
      "service:active-filters",
    ) as ActiveFiltersService;

    await render<Context>(
      hbs`
        <div>
          {{if (is-active-filter this.docType) "active" "inactive"}}
        </div>
      `,
    );

    assert.dom("div").hasText("inactive");

    activeFilters.update({
      [FacetName.DocType]: [docType],
    });

    await rerender();

    assert.dom("div").hasText("active");
  });
});
