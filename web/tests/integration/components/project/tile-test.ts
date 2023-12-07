import { findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";
import { module, test } from "qunit";
import { assert as emberAssert } from "@ember/debug";
import htmlElement from "hermes/utils/html-element";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import { setFeatureFlag } from "hermes/utils/mirage-utils";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const PROJECT_TITLE = "[data-test-title]";
const PROJECT_DESCRIPTION = "[data-test-description]";
const PROJECT_JIRA_TYPE = "[data-test-jira-type]";
const PROJECT_JIRA_KEY = "[data-test-jira-key]";
const PRODUCT = "[data-test-product]";
const PRODUCT_AVATAR = "[data-test-product-avatar]";
interface ProjectTileComponentTestContext extends MirageTestContext {
  project: HermesProject;
  jiraStatus: string;
}

module("Integration | Component | project/tile", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: ProjectTileComponentTestContext) {
    this.server.create("project", {
      title: "Test Title",
      description: "Test Description",
      jiraIssue: {
        key: "TEST-123",
        type: "Epic",
      },
    });

    this.server.create("related-hermes-document");
    this.server.create("related-hermes-document");

    this.server.create("document", {
      product: "Foo",
    });

    this.server.create("document", {
      product: "Bar",
    });

    let hermesDocuments = this.server.schema.relatedHermesDocument
      .all()
      .models.map((doc: { attrs: RelatedHermesDocument }) => {
        let d = doc.attrs;
        return {
          ...d,
          product: this.server.schema.document.find(d.googleFileID)?.product,
        };
      });

    // Ignore the factory-created document
    hermesDocuments = hermesDocuments.slice(1);

    this.server.schema.projects.first().update({
      hermesDocuments,
    });

    this.project = this.server.schema.projects.first();
    await setupProductIndex(this);
  });

  test("it renders the title and description", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    const { title, description } = this.project;

    assert.dom(PROJECT_TITLE).hasText(title);

    emberAssert("description must exist", description);

    assert.dom(PROJECT_DESCRIPTION).hasText(description);

    this.set("project.description", null);

    assert.dom(PROJECT_DESCRIPTION).doesNotExist();
  });

  test("it renders the jira issue if present", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    const { jiraIssue } = this.project;

    emberAssert("jiraIssue must exist", jiraIssue);

    const { key, type } = jiraIssue;

    assert.dom(PROJECT_JIRA_KEY).hasText(key);
    assert.dom(PROJECT_JIRA_TYPE).hasText(type);

    this.set("project.jiraIssue", null);

    assert.dom(PROJECT_JIRA_KEY).doesNotExist();
    assert.dom(PROJECT_JIRA_TYPE).doesNotExist();
  });

  test("it renders product avatars if the project has documents", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    assert.dom(PRODUCT_AVATAR).exists({ count: 1 });

    this.set("project.products", ["Vault", "Hermes"]);

    assert.dom(PRODUCT_AVATAR).exists({ count: 2 });
  });

  test('if the status of a jiraIssue is "Done," the key is rendered with a line through it', async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    assert.dom(PROJECT_JIRA_KEY).doesNotHaveClass("line-through");

    const project = this.server.schema.projects.first();

    project.update({
      jiraIssue: {
        key: "TEST-123",
        type: "Epic",
        status: "Done",
      },
    });

    this.set("project", project);

    assert.dom(PROJECT_JIRA_KEY).hasClass("line-through");
  });

  test("it truncates long titles and descriptions", async function (this: ProjectTileComponentTestContext, assert) {
    this.set(
      "project",
      this.server.create("project", {
        title:
          "This is a long text string that should be truncated. It goes on and on and on, and then, wouldn't you know it, it goes on some more.",
        description:
          "This is a long text string that should be truncated. It goes on and on and on, and then, wouldn't you know it, it goes on some more.",
      }),
    );

    await render<ProjectTileComponentTestContext>(hbs`
      <div style="width:300px">
        <Project::Tile @project={{this.project}} />
      </div>
    `);

    const titleHeight = htmlElement(PROJECT_TITLE).offsetHeight;
    const descriptionHeight = htmlElement(PROJECT_DESCRIPTION).offsetHeight;

    const titleLineHeight = Math.ceil(
      parseFloat(
        window.getComputedStyle(htmlElement(PROJECT_TITLE)).lineHeight,
      ),
    );

    const descriptionLineHeight = Math.ceil(
      parseFloat(
        window.getComputedStyle(htmlElement(PROJECT_DESCRIPTION)).lineHeight,
      ),
    );

    assert.equal(titleHeight, titleLineHeight * 2);
    assert.equal(descriptionHeight, descriptionLineHeight * 3);
  });
});
