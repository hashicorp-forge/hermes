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

    this.server.create("related-hermes-document", {
      id: 996,
      product: "Engineering",
    });

    this.server.create("related-hermes-document", {
      id: 995,
      product: "Consul",
    });

    this.server.createList("document", 3);

    const firstDoc = this.server.schema.relatedHermesDocument.first().attrs;
    const secondDoc =
      this.server.schema.relatedHermesDocument.all().models[1].attrs;
    const thirdDoc =
      this.server.schema.relatedHermesDocument.all().models[2].attrs;
    const fourthDoc =
      this.server.schema.relatedHermesDocument.all().models[3].attrs;
    const fifthDoc =
      this.server.schema.relatedHermesDocument.all().models[4].attrs;

    this.server.create("project", {
      name: "Listbox component rollout (Ember)",
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
      name: "Hermes Responsive Design",
      documents: [secondDoc, firstDoc],
    });

    this.server.create("project", {
      name: "Infrastructure Migration from AWS",
      documents: [thirdDoc, secondDoc],
    });

    this.server.create("project", {
      documents: [fourthDoc],
      name: "Cross-Technology Integrations and Interoperability",
      description:
        "How a group of engineers built a thingy dingy out of ice and sweat tornados",
    });

    this.server.create("project", {
      name: "Shared admin interface overhaul",
      documents: [thirdDoc, firstDoc, fifthDoc, fourthDoc],
    });

    this.server.create("project", {
      name: "UI/UX audit and improvements",
      description:
        "When we first heard about having a project for this, we wondered what it would be like to have a project for this.",
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

    this.server.create("project", {
      name: "Hermes API v2",
    });

    await visit("/projects");

    await this.pauseTest();
  });
});
