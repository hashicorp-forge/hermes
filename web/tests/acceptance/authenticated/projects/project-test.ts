import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test, todo } from "qunit";
import { visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";
import { HermesDocument } from "hermes/types/document";
import { RelatedExternalLink } from "hermes/components/related-resources";

const ALL_PROJECTS_LINK = "[data-test-all-projects-link]";
const TITLE = "[data-test-project-title]";
const DESCRIPTION = "[data-test-project-description]";

const DOCUMENT_LIST_ITEM = "[data-test-document-list-item]";
const OVERFLOW_MENU_AFFORDANCE = "[data-test-overflow-menu-affordance]";

const DOCUMENT_LINK = "[data-test-document-link]";
const EXTERNAL_LINK = "[data-test-related-link]";

interface AuthenticatedProjectsProjectRouteTestContext
  extends MirageTestContext {}

module("Acceptance | authenticated/projects/project", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (
    this: AuthenticatedProjectsProjectRouteTestContext,
  ) {
    await authenticateSession({});
    this.server.create("project", {
      id: 100,
      title: "Introducing Projects",
      description: "A way to organize documents across product areas.",
    });
  });

  test("the page title is correct", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/100");
    assert.equal(getPageTitle(), "Test Project | Hermes");
  });

  test("it renders correct empty state", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    const project = this.server.schema.projects.find(100);

    project.update({
      description: "",
    });

    await visit("/projects/100");

    assert.dom(ALL_PROJECTS_LINK).hasAttribute("href", "/projects");
    assert.dom(TITLE).hasText("Test Project");
    assert.dom(DESCRIPTION).hasText("Add a description");

    // TODO: assert more things
  });

  test("it renders the correct filled-in state", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    this.server.createList("document", 4);
    this.server.createList("related-external-link", 2);

    const project = this.server.schema.projects.find(100);
    const documents = this.server.schema.document
      .all()
      .models.map((model: { attrs: HermesDocument }) => {
        const relatedDoc = {
          ...model.attrs,
          googleFileID: model.attrs.objectID,
        };

        return relatedDoc;
      });
    const relatedLinks = this.server.schema.relatedExternalLinks
      .all()
      .models.map((model: { attrs: RelatedExternalLink }) => model.attrs);

    project.update({
      documents,
      relatedLinks,
      jiraObject: {
        type: "Enhancement",
        key: "HERMES-123",
        url: "https://jira.example.com/browse/HERMES-123",
        priority: "High",
        status: "In Progress",
        assignee: "testuser@example.com",
        summary: "Rollout plan for projects",
      },
    });

    await visit("/projects/100");

    assert.dom(DOCUMENT_LINK).exists({ count: 4 });
    assert.dom(EXTERNAL_LINK).exists({ count: 2 });

    assert
      .dom(DOCUMENT_LINK)
      .containsText("Test Document 0")
      .containsText("testuser@example.com")
      .containsText("RFC")
      .containsText("WIP")
      .hasAttribute("href", "/documents/0");

    // confirm overflow menus

    assert
      .dom(EXTERNAL_LINK)
      .containsText("Related External Link 0")
      .hasAttribute("href", "https://0.hashicorp.com");

    await this.pauseTest();
  });

  todo(
    "you can copy a project's URL",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {
      assert.true(false);
    },
  );

  todo(
    "you can edit a project title",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );

  todo(
    "you can't save an empty project title",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );

  todo(
    "you can add a document to a project",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );

  todo(
    "you can remove a document from a project",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );

  todo(
    "you can archive a project",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );

  todo(
    "you can complete a project",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );
});
