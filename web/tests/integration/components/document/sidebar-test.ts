import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";
import { HermesDocumentType } from "hermes/types/document-type";
import { TEST_USER_2_EMAIL, TEST_USER_EMAIL } from "hermes/mirage/utils";
import PersonModel from "hermes/models/person";

const SUMMARY_CONTAINER = "[data-test-document-summary]";
const SUMMARY_EMPTY_STATE = `${SUMMARY_CONTAINER} .empty-state-text`;

interface DocumentSidebarComponentTestContext extends MirageTestContext {
  profile: PersonModel;
  document: HermesDocument;
  docType: Promise<HermesDocumentType>;
  deleteDraft: (docID: string) => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

module("Integration | Component | document/sidebar", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: DocumentSidebarComponentTestContext) {
    await authenticateSession({});

    const authenticatedUser = this.owner.lookup(
      "service:authenticated-user",
    ) as AuthenticatedUserService;

    await authenticatedUser.loadInfo.perform();

    this.set("profile", authenticatedUser.info);
    this.server.create("document", {
      owners: [TEST_USER_EMAIL],
      isDraft: false,
      status: "In-Review",
    });

    this.set("document", this.server.schema.document.first().attrs);
    this.set("docType", new Promise(() => {}));
    this.set("toggleCollapsed", () => {});
    this.set("deleteDraft", (docID: string) => {});
  });

  test("it shows the correct summary empty state based on if the viewer is the doc owner", async function (this: DocumentSidebarComponentTestContext, assert) {
    await render<DocumentSidebarComponentTestContext>(hbs`
      <Document::Sidebar
        @profile={{this.profile}}
        @document={{this.document}}
        @docType={{this.docType}}
        @isCollapsed={{false}}
        @toggleCollapsed={{this.toggleCollapsed}}
        @deleteDraft={{this.deleteDraft}}
      />
    `);

    // By default the viewer is the doc owner
    assert.dom(SUMMARY_EMPTY_STATE).containsText("Enter a summary");

    // Set the doc owner to someone else
    this.set(
      "document",
      this.server.schema.document.first().update({
        owners: [TEST_USER_2_EMAIL],
      }),
    );

    assert.dom(SUMMARY_EMPTY_STATE).containsText("None");
  });
});
