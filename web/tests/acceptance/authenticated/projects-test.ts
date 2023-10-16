import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { findAll, visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";

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
      title: "Listbox component rollout (Ember)",
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
      title: "Hermes Responsive Design",
      documents: [secondDoc, firstDoc],
      jiraObject: {
        key: "HRD-041",
      },
    });

    this.server.create("project", {
      title: "Infrastructure Migration from AWS",
      documents: [thirdDoc, secondDoc],
      jiraObject: {
        key: "LABS-103",
        status: "Done",
      },
    });

    this.server.create("project", {
      documents: [fourthDoc],
      title: "Cross-Technology Integrations and Interoperability",
      description:
        "How a group of engineers built a thingy dingy out of ice and sweat tornados",
    });

    this.server.create("project", {
      title: "Shared Admin",
      documents: [firstDoc, fifthDoc, fourthDoc, thirdDoc],
    });

    this.server.create("project", {
      title: "UI/UX audit and improvements",
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
      title: "Hermes API v2",
    });

    await visit("/projects");

    await this.pauseTest();
  });

  test("it fetches a list of projects", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    this.server.createList("project", 3);

    await visit("/projects");

    assert.dom("[data-test-project]").exists({ count: 3 });

    const expectedTitles = this.server.schema.projects
      .all()
      .models.map((project: HermesProject) => project.title);

    const renderedTitles = findAll("[data-test-project]").map(
      (e) => e.textContent?.trim(),
    );

    assert.deepEqual(renderedTitles, expectedTitles);
  });
});
