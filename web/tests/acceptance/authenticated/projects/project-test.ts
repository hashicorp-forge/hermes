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
    const FAKE_DOCUMENTS = [
      {
        title: "The Tao of HashiCorp",
        status: "Approved",
        product: "Cloud Platform",
        docType: "Memo",
        owners: ["armon@hashicorp.com"],
        ownerPhotos: [
          "https://lh3.googleusercontent.com/a-/ALV-UjXorptEFt6Ua_rLpNaCWjEVmWF8tbo_uPzA3BaPTjkwVmo=s100",
        ],
      },
      {
        title: "HCP Vault Secrets and Radar",
        status: "In Review",
        docType: "PRFAQ",
        owners: ["jfreda@hashicorp.com"],
        ownerPhotos: [
          "https://lh3.googleusercontent.com/a-/ACB-R5TEQbIzp4iI581C82PUOQUv6OHWQnoelGgg4g3e=s100",
        ],
      },
      {
        title: "Announcing Boundary Desktop",
        status: "In Review",
        docType: "RFC",
        product: "Boundary",
        owners: ["nsmith@hashicorp.com"],
        ownerPhotos: [
          "https://lh3.googleusercontent.com/a-/ACB-R5SnPc89zyde2LB2cG8402-3ArtK1U1UwVoxcNHH=s100",
        ],
      },
      {
        title:
          "Creating a multi-cloud golden image pipeline with Terraform Cloud and HCP Packer",
        status: "In Review",
        docType: "PRD",
        product: "Packer",
        owners: ["sean.fitzgerald@hashicorp.com"],
        ownerPhotos: [
          "https://lh3.googleusercontent.com/a-/ALV-UjX1D1Tlr2TAdJ8G1p3ry8JjzsaLSLcNZ4puJUbL4-FNjg=s100",
        ],
      },
      {
        title: "Webhooks and streamlined run-task reviews",
        status: "In Review",
        docType: "RFC",
        product: "Labs",
      },
      {
        title: "UI updates for 1.15",
        status: "In Review",
        docType: "RFC",
        product: "Terraform",
      },
      {
        title: "No-code provisioning",
        status: "In Review",
        docType: "RFC",
        product: "Terraform",
      },
    ];

    this.server.create("document", FAKE_DOCUMENTS[0]);
    this.server.create("document", FAKE_DOCUMENTS[1]);
    this.server.create("document", FAKE_DOCUMENTS[2]);
    this.server.create("document", FAKE_DOCUMENTS[3]);
    this.server.create("document", FAKE_DOCUMENTS[4]);
    this.server.create("document", FAKE_DOCUMENTS[5]);
    this.server.create("document", FAKE_DOCUMENTS[6]);

    this.server.create("product", {
      name: "Labs",
      abbreviation: "LAB",
    });

    this.server.create("product", {
      name: "Engineering",
      abbreviation: "ENG",
    });

    this.server.create("product", {
      name: "Community",
      abbreviation: "OC",
    });
    this.server.create("product", {
      name: "Sentinel",
      abbreviation: "SL",
    });

    this.server.create("related-hermes-document", {
      product: "Vault",
      status: "In review",
    });

    this.server.create("related-hermes-document", {
      product: "Terraform",
      status: "Approved",
    });

    this.server.create("related-hermes-document", {
      product: "Labs",
    });

    this.server.create("related-hermes-document", {
      product: "Engineering",
    });

    this.server.create("related-hermes-document", {
      product: "Consul",
    });

    this.server.create("related-hermes-document", {
      product: "Terraform",
    });

    this.server.create("related-hermes-document", {
      product: "Sentinel",
    });

    this.server.create("related-hermes-document", {
      product: "Cloud Platform",
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
    const sixthDoc =
      this.server.schema.relatedHermesDocument.all().models[5].attrs;
    const seventhDoc =
      this.server.schema.relatedHermesDocument.all().models[6].attrs;
    const eighthDoc =
      this.server.schema.relatedHermesDocument.all().models[7].attrs;

    this.server.create("project", {
      title: "Listbox component rollout (Ember)",
      description: "Migrating from our old component",
      documents: [firstDoc],

      relatedLinks: [
        {
          title: "Hashicorp",
          url: "https://hashicorp.com",
        },
      ],
    });

    this.server.create("project", {
      title: "Hermes Responsive Design",
      description: "Making Hermes work on mobile",
      documents: [secondDoc, seventhDoc],
      jiraObject: {
        key: "HRD-041",
      },
    });

    this.server.create("project", {
      title: "Infrastructure Migration from AWS",
      documents: [thirdDoc, seventhDoc],
      jiraObject: {
        key: "LABS-103",
        status: "Done",
      },
    });

    this.server.create("project", {
      documents: [eighthDoc, fourthDoc],
      title: "Cross-Technology Integrations and Interoperability",
      description:
        "How a group of engineers built a thingy dingy out of ice and sweat tornados",
      jiraObject: {
        type: "Enhancement",
        key: "RD-092",
        url: "https://jira.example.com/browse/HERMES-123",
        priority: "High",
        status: "In Progress",
        assignee: "testuser@example.com",
        summary:
          "Add Hermes application version & revision in the footer of the UI",
      },
    });

    this.server.create("project", {
      title: "Shared Admin",
      documents: [firstDoc, fifthDoc, fourthDoc, thirdDoc],
    });

    this.server.create("project", {
      title: "UI/UX audit and improvements",
      description:
        "When we first heard about having a project for this, we wondered what it would be like to have a project for this.",
      documents: [fifthDoc, fourthDoc],
      jiraObject: {
        type: "Enhancement",
        key: "RD-092",
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
      documents: [thirdDoc],
      jiraObject: {
        key: "HERMES-123",
        type: "Task",
        url: "https://jira.example.com/browse/HERMES-123",
        priority: "High",
        status: "In Progress",
        assignee: "",
      },
    });

    this.server.create("related-external-link", {
      title: "Slideshow",
      url: "https://docs.google.com/presentation/d/1BTVXH5wOHDUh2lm-75NH5wqQ6O9C9OSwv27RHnsaXAc/edit#slide=id.g22512317f0d_0_0",
    });

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
      documents: documents.slice(0, 3),
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
