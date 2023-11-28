import { findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";
import { module, test } from "qunit";
import { assert as emberAssert } from "@ember/debug";
import htmlElement from "hermes/utils/html-element";
import { RelatedHermesDocument } from "hermes/components/related-resources";

const PROJECT_TITLE = "[data-test-title]";
const PROJECT_DESCRIPTION = "[data-test-description]";
const PROJECT_PRODUCT = "[data-test-product]";
const PROJECT_JIRA_TYPE = "[data-test-jira-type]";
const PROJECT_JIRA_KEY = "[data-test-jira-key]";

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
  });

  test("it renders as expected (complete model)", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    const { title, description, hermesDocuments, jiraIssue } = this.project;
    const documentProducts = hermesDocuments?.map((doc) => doc.product).uniq();

    assert.dom(PROJECT_TITLE).hasText(title);

    emberAssert("description must exist", description);

    assert.dom(PROJECT_DESCRIPTION).hasText(description);

    assert.deepEqual(
      findAll(PROJECT_PRODUCT).map((el) => el.textContent?.trim()),
      documentProducts,
    );

    emberAssert("jiraIssue must exist", jiraIssue);

    const { key, type } = jiraIssue;

    emberAssert("jiraIssue type must exist", type);

    assert.dom(PROJECT_JIRA_KEY).hasText(key);
    assert.dom(PROJECT_JIRA_TYPE).hasText(type);
  });

  test("it renders as expected (incomplete model)", async function (this: ProjectTileComponentTestContext, assert) {
    const project = this.server.schema.projects.first();

    project.update({
      description: null,
      hermesDocuments: null,
      jiraIssue: null,
    });

    this.set("project", project);

    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    assert.dom(PROJECT_DESCRIPTION).doesNotExist();
    assert.dom(PROJECT_PRODUCT).doesNotExist();
    assert.dom(PROJECT_JIRA_KEY).doesNotExist();
    assert.dom(PROJECT_JIRA_TYPE).doesNotExist();
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
