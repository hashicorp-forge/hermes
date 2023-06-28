import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";

interface DocumentSidebarRelatedResourcesAddTestContext
  extends MirageTestContext {
  noop: () => void;
  searchNoop: (dd: any, query: string) => Promise<void>;
  shownDocuments: Record<string, HermesDocument>;
}

module(
  "Integration | Component | document/sidebar/related-resources/add",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function (
      this: DocumentSidebarRelatedResourcesAddTestContext
    ) {
      this.server.createList("document", 10);
      this.set("noop", () => {});

      let shownDocuments = this.server.schema.document.all().models;

      const reducerFunction = (
        acc: Record<string, HermesDocument>,
        document: { attrs: HermesDocument }
      ) => {
        console.log("called");
        acc[document.attrs.objectID] = document.attrs;
        return acc;
      };

      shownDocuments = shownDocuments.reduce(reducerFunction, {});

      console.log(shownDocuments);

      const getFirstFourRecords = (documents: any) => {
        return Object.keys(documents)
          .slice(0, 4)
          .reduce((acc, key) => {
            acc[key] = documents[key];
            return acc;
          }, {} as Record<string, HermesDocument>);
      };

      // slice to 4 because that's the max number of results we show
      shownDocuments = getFirstFourRecords(shownDocuments);

      this.set("shownDocuments", shownDocuments);
      this.set("searchNoop", (dd: any, query: string) => {
        if (query === "") {
          this.set("shownDocuments", shownDocuments);
        } else {
          let matches = this.server.schema.document
            .where((document: HermesDocument) => {
              return document.title.toLowerCase().includes(query.toLowerCase());
            })
            .models.reduce(reducerFunction, {});
          this.set("shownDocuments", getFirstFourRecords(matches));
        }
        return Promise.resolve();
      });
    });

    test("it conditionally renders a list header", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesAddTestContext>(hbs`
        <Document::Sidebar::RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addRelatedExternalLink={{this.noop}}
          @addRelatedDocument={{this.noop}}
          @shownDocuments={{this.shownDocuments}}
          @objectID="test"
          @relatedDocuments={{array}}
          @relatedLinks={{array}}
          @search={{this.searchNoop}}
        />
      `);

      // assert that the title is correct
      // assert that the placeholder is correct
      // assert that the list header is rendered

      await this.pauseTest();
    });

    test("it renders a loading spinner", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it renders a list as expected", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it renders a 'no matches' message when there are no results", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it conditionally enables keyboard navigation", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it searches for documents", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it can add external links", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});
  }
);
