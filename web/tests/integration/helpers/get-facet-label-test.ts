import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { FacetName } from "hermes/components/header/toolbar";
import { FacetLabel } from "hermes/helpers/get-facet-label";

interface Context extends TestContext {
  docType: FacetName;
  owners: FacetName;
  status: FacetName;
  product: FacetName;
}

module("Integration | Helper | get-facet-label", function (hooks) {
  setupRenderingTest(hooks);

  test("it translates the facet label", async function (assert) {
    this.set("docType", FacetName.DocType);
    this.set("owners", FacetName.Owners);
    this.set("status", FacetName.Status);
    this.set("product", FacetName.Product);

    await render<Context>(hbs`
      <div class="doc-type">
        {{get-facet-label this.docType}}
      </div>
      <div class="owners">
        {{get-facet-label this.owners}}
      </div>
      <div class="status">
        {{get-facet-label this.status}}
      </div>
      <div class="product">
        {{get-facet-label this.product}}
      </div>
      <div class="random">
        {{get-facet-label "foo"}}
      </div>
    `);

    assert.dom(".doc-type").hasText(FacetLabel.DocType);
    assert.dom(".owners").hasText(FacetLabel.Owners);
    assert.dom(".status").hasText(FacetLabel.Status);
    assert.dom(".product").hasText(FacetLabel.Product);
    assert.dom(".random").hasText("foo");
  });
});
