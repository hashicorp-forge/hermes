import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface RelatedResourcesAddExternalResourceTestContext extends TestContext {
  onSubmit: () => void;
  onInput: () => void;
}

module(
  "Integration | Component | related-resources/add/external-resource",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it renders as expected", async function (this: RelatedResourcesAddExternalResourceTestContext, assert) {
      this.set("onSubmit", () => {});
      this.set("onInput", () => {});

      await render<RelatedResourcesAddExternalResourceTestContext>(hbs`
      <RelatedResources::Add::FallbackExternalResource
        @title="Test"
        @url="https://example.com"
        @onSubmit={{this.onSubmit}}
        @onInput={{this.onInput}}
      />
    `);

      assert
        .dom("[data-test-add-fallback-external-resource]")
        .exists("shows the form when the URL is not loading");

      assert.dom(".external-resource-title-input").hasValue("Test");

      assert.dom("[data-test-url]").hasText("https://example.com");
    });
  }
);
