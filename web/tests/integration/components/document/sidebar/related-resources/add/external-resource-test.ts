import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface DocumentSidebarRelatedResourcesAddExternalResourceTestContext
  extends TestContext {
  onSubmit: () => void;
  onInput: () => void;
}

module(
  "Integration | Component | document/sidebar/related-resources/add/external-resource",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it renders as expected", async function (this: DocumentSidebarRelatedResourcesAddExternalResourceTestContext, assert) {
      this.set("onSubmit", () => {});
      this.set("onInput", () => {});

      await render<DocumentSidebarRelatedResourcesAddExternalResourceTestContext>(hbs`
      <Document::Sidebar::RelatedResources::Add::ExternalResource
        @title="Test"
        @url="https://example.com"
        @onSubmit={{this.onSubmit}}
        @onInput={{this.onInput}}
      />
    `);

      assert
        .dom("[data-test-add-external-resource-form]")
        .exists("shows the form when the URL is not loading");

      assert.dom(".external-resource-title-input").hasValue("Test");

      assert
        .dom("[data-test-add-external-resource-truncated-url]")
        .hasText("https://example.com");
    });
  }
);
