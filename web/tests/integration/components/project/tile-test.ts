import { render, settled } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";
import { module, test } from "qunit";
import { assert as emberAssert } from "@ember/debug";
import htmlElement from "hermes/utils/html-element";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";
import { PROJECT_TILE_MAX_PRODUCTS } from "hermes/components/project/tile";

const PROJECT_TITLE = "[data-test-title]";
const PROJECT_LINK = "[data-test-project-tile-link]";
const JIRA_LINK = "[data-test-jira-link]";
const PROJECT_JIRA_TYPE_IMAGE = "[data-test-issue-type-image]";
const PROJECT_JIRA_KEY = "[data-test-jira-key]";
const PRODUCT_LINK = "[data-test-product] a";
const PRODUCT_AVATAR = "[data-test-product-avatar]";
const ADDITIONAL_PRODUCTS_LABEL = "[data-test-additional-products-label]";

interface ProjectTileComponentTestContext extends MirageTestContext {
  project: HermesProject;
  jiraStatus: string;
  tileIsShown: boolean;
  query: string;
}

module("Integration | Component | project/tile", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: ProjectTileComponentTestContext) {
    const issueID = "TEST-123";

    this.server.create("jira-issue", {
      key: issueID,
    });

    this.server.create("project", {
      title: "Test Title",
      description: "Test Description",
      jiraIssueID: issueID,
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
    this.set("project.jiraIssueID", null);

    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    const { title, description } = this.project;

    assert.dom(PROJECT_TITLE).hasText(title);

    emberAssert("description must exist", description);

    assert.dom(PROJECT_JIRA_KEY).doesNotExist();
  });

  test("it loads and renders the jira issue if present", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    const issue = this.server.schema.jiraIssues.findBy({
      key: this.project.jiraIssueID,
    });

    const { key, issueType } = issue.attrs;

    assert.dom(JIRA_LINK).hasAttribute("href", issue.url);
    assert.dom(PROJECT_JIRA_KEY).hasText(key);
    assert.dom(PROJECT_JIRA_TYPE_IMAGE).hasAttribute("alt", issueType);
  });

  test("it renders product avatars if the project has documents", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    assert.dom(PRODUCT_AVATAR).exists({ count: 1 });

    this.set("project.products", ["Vault", "Hermes"]);

    assert.dom(PRODUCT_AVATAR).exists({ count: 2 });

    assert
      .dom(PRODUCT_LINK)
      .hasAttribute(
        "href",
        "/product-areas/vault",
        "url is correctly dasherized",
      );
  });

  test('if the status of a jiraIssue includes "done" or "closed," the key is rendered with a line through it', async function (this: ProjectTileComponentTestContext, assert) {
    this.set("tileIsShown", true);

    // This will cause the tile to rerender and refetch the JiraIssue
    const rerenderTile = async () => {
      this.set("tileIsShown", false);
      this.set("tileIsShown", true);
      await settled();
    };

    await render<ProjectTileComponentTestContext>(hbs`
      {{#if this.tileIsShown}}
        <Project::Tile @project={{this.project}} />
      {{/if}}
    `);

    assert.dom(PROJECT_JIRA_KEY).doesNotHaveClass("line-through");

    const project = this.server.schema.projects.first();

    const jiraIssue = this.server.schema.jiraIssues.findBy({
      key: project.jiraIssueID,
    });

    jiraIssue.update({
      status: "It's Done",
    });

    await rerenderTile();

    assert.dom(PROJECT_JIRA_KEY).hasClass("line-through");

    jiraIssue.update({
      status: "Open",
    });

    await rerenderTile();

    assert.dom(PROJECT_JIRA_KEY).doesNotHaveClass("line-through");

    jiraIssue.update({
      status: "Closed",
    });

    await rerenderTile();

    assert.dom(PROJECT_JIRA_KEY).hasClass("line-through");
  });

  test("it truncates long titles", async function (this: ProjectTileComponentTestContext, assert) {
    this.set(
      "project",
      this.server.create("project", {
        title:
          "This is a long text string that should be truncated. It goes on and on and on, and then, wouldn't you know it, it goes on some more.",
      }),
    );

    await render<ProjectTileComponentTestContext>(hbs`
      <div style="width:300px">
        <Project::Tile @project={{this.project}} />
      </div>
    `);

    const titleHeight = htmlElement(PROJECT_TITLE).offsetHeight;

    const titleLineHeight = Math.ceil(
      parseFloat(
        window.getComputedStyle(htmlElement(PROJECT_TITLE)).lineHeight,
      ),
    );

    assert.equal(
      titleHeight,
      titleLineHeight,
      "long title remains only one line",
    );
  });

  test("it truncates the number of project avatars", async function (this: ProjectTileComponentTestContext, assert) {
    this.set("project.products", [
      "Vault",
      "Hermes",
      "Terraform",
      "Waypoint",
      "Consul",
    ]);

    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    assert.dom(PRODUCT_AVATAR).exists({ count: PROJECT_TILE_MAX_PRODUCTS });
    assert.dom(ADDITIONAL_PRODUCTS_LABEL).hasText("+2");
  });

  test("it can handle HermesProjects and HermesProjectHits", async function (this: ProjectTileComponentTestContext, assert) {
    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} />
    `);

    // Note: Factory project has an `id` but no `objectID`

    assert
      .dom(PROJECT_TITLE)
      .hasText(this.project.title, "project with an id renders");
    assert
      .dom(PROJECT_LINK)
      .hasAttribute("href", `/projects/${this.project.id}`);

    this.server.create("project", {
      id: null,
      objectID: "123",
    });

    const project = this.server.schema.projects.findBy({
      objectID: "123",
    }).attrs;

    this.set("project", project);

    assert.dom(PROJECT_TITLE).hasText(project.title);
    assert
      .dom(PROJECT_LINK)
      .hasAttribute("href", `/projects/${project.objectID}`);
  });

  test("it query-highlights the title", async function (this: ProjectTileComponentTestContext, assert) {
    const query = "Test";
    const title = `The ${query} Project`;

    this.set("project.title", title);
    this.set("query", query);

    await render<ProjectTileComponentTestContext>(hbs`
      <Project::Tile @project={{this.project}} @query={{this.query}} />
    `);

    assert.dom(PROJECT_TITLE).hasText(title);
    assert.dom(`${PROJECT_TITLE} mark`).hasText(query);
  });
});
