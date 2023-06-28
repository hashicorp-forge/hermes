import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface DocumentSidebarRelatedResourcesAddExternalResourceTestContext
  extends TestContext {
  onSubmit: () => void;
  onInput: () => void;
  urlIsLoading: boolean;
  defaultFaviconIsShown: boolean;
}

module(
  "Integration | Component | document/sidebar/related-resources/add/external-resource",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it renders as expected", async function (this: DocumentSidebarRelatedResourcesAddExternalResourceTestContext, assert) {
      this.set("onSubmit", () => {});
      this.set("onInput", () => {});
      this.set("urlIsLoading", true);
      this.set("defaultFaviconIsShown", true);

      await render<DocumentSidebarRelatedResourcesAddExternalResourceTestContext>(hbs`
      <Document::Sidebar::RelatedResources::Add::ExternalResource
        @urlIsLoading={{this.urlIsLoading}}
        @title="Test"
        @url="https://example.com"
        @defaultFaviconIsShown={{this.defaultFaviconIsShown}}
        @faviconURL="https://example.com/favicon.ico"
        @onSubmit={{this.onSubmit}}
        @onInput={{this.onInput}}
      />
    `);

      assert
        .dom("[data-test-external-resource-url-is-loading]")
        .hasText(
          "Reading URL...",
          'shows "Reading URL..." when the URL is loading'
        );

      this.set("urlIsLoading", false);

      assert.dom("[data-test-external-resource-default-favicon]").exists();

      assert
        .dom("[data-test-add-external-resource-form]")
        .exists("shows the form when the URL is not loading");

      assert.dom(".external-resource-title-input").hasValue("Test");

      assert
        .dom("[data-test-add-external-resource-truncated-url]")
        .hasText("https://example.com");

      this.set("defaultFaviconIsShown", false);

      assert
        .dom("[data-test-external-resource-custom-favicon]")
        .exists()
        .hasAttribute("src", "https://example.com/favicon.ico");
    });
  }
);
