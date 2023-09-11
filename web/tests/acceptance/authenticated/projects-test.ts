import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";

interface AuthenticatedProjectsRouteTestContext extends MirageTestContext {}
module("Acceptance | authenticated/projects", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    await visit("/all/projects");
    assert.equal(getPageTitle(), "All Projects | Hermes");
  });

  test("it renders a list of projects", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    this.server.create("related-hermes-document", {
      id: 999,
      product: "Vault",
      status: "In review",
    });

    this.server.create("related-hermes-document", {
      id: 998,
      product: "Terraform",
      status: "Approved",
    });

    this.server.create("related-hermes-document", {
      id: 997,
      product: "Labs",
    });

    this.server.createList("document", 3);

    const firstDoc = this.server.schema.relatedHermesDocument.first().attrs;
    const secondDoc =
      this.server.schema.relatedHermesDocument.all().models[1].attrs;

    console.log(firstDoc);
    console.log(secondDoc);

    this.server.create("project", {
      description: "This is a test project",
      documents: [firstDoc],

      relatedLinks: [
        {
          name: "Hashicorp",
          url: "https://hashicorp.com",
        },
      ],
    });
    this.server.create("project", {
      documents: [firstDoc, secondDoc],
    });
    this.server.create("project", {
      description: "This is a test project two",
      jiraObject: {
        type: "Enhancement",
        key: "HERMES-123",
        url: "https://jira.example.com/browse/HERMES-123",
        priority: "High",
        status: "In Progress",
        assignee: "testuser@example.com",
        summary:
          "Add Hermes application version & revision in the footer of the UI",
      },
    });

    this.server.create("project", {});

    await visit("/projects");

    await this.pauseTest();
  });
});
