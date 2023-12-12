import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { click, fillIn, visit, waitFor } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";
import { ProjectStatus } from "hermes/types/project-status";
import {
  TEST_JIRA_ASSIGNEE,
  TEST_JIRA_ASSIGNEE_AVATAR,
  TEST_JIRA_ISSUE_STATUS,
  TEST_JIRA_ISSUE_SUMMARY,
  TEST_JIRA_ISSUE_URL,
  TEST_JIRA_PRIORITY,
  TEST_JIRA_PRIORITY_IMAGE,
  TEST_USER_EMAIL,
  TEST_USER_PHOTO,
} from "hermes/utils/mirage-utils";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";
import { TEST_JIRA_WORKSPACE_URL } from "hermes/utils/hermes-urls";

const TITLE = "[data-test-project-title]";
const TITLE_BUTTON = `${TITLE} button`;
const TITLE_INPUT = `${TITLE} textarea`;
const TITLE_ERROR = `${TITLE} .hds-form-error`;

const DESCRIPTION = "[data-test-project-description]";
const DESCRIPTION_BUTTON = `${DESCRIPTION} button`;
const DESCRIPTION_INPUT = `${DESCRIPTION} textarea`;

const CREATED_TIME = "[data-test-created-time]";
const MODIFIED_TIME = "[data-test-modified-time]";

const SAVE_EDITABLE_FIELD_BUTTON = ".editable-field [data-test-save-button]";

const ADD_RESOURCE_BUTTON = "[data-test-add-project-resource-button]";

const RELATED_LINK_MODAL = "[data-test-add-or-edit-external-resource-modal]";
const RELATED_LINK_TITLE_INPUT =
  "[data-test-external-resource-form-title-input]";
const RELATED_LINK_URL_INPUT = "[data-test-external-resource-url-input]";

const RELATED_LINK_SAVE_BUTTON = `${RELATED_LINK_MODAL} [data-test-save-button]`;

const ADD_PROJECT_RESOURCE_MODAL = "[data-test-add-related-resource-modal]";
const MODAL_SEARCH_INPUT = "[data-test-related-resources-search-input]";
const ADD_DOCUMENT_OPTION = ".related-document-option";

const EMPTY_BODY = "[data-test-empty-body]";

const DOCUMENTS_HEADER = "[data-test-documents-header]";
const DOCUMENT_COUNT = "[data-test-document-count]";
const DOCUMENT_LIST = "[data-test-document-list]";

const EXTERNAL_LINKS_HEADER = "[data-test-external-links-header]";
const EXTERNAL_LINK_COUNT = "[data-test-external-link-count]";
const EXTERNAL_LINK_LIST = "[data-test-external-link-list]";

const DOCUMENT_LIST_ITEM = "[data-test-document-list-item]";
const OVERFLOW_MENU_BUTTON = "[data-test-overflow-menu-button]";
const OVERFLOW_MENU_EDIT = "[data-test-overflow-menu-action='edit']";
const OVERFLOW_MENU_REMOVE = "[data-test-overflow-menu-action='remove']";

const DOCUMENT_LINK = "[data-test-document-link]";
const DOCUMENT_TITLE = "[data-test-document-title]";
const DOCUMENT_SUMMARY = "[data-test-document-summary]";
const DOCUMENT_NUMBER = "[data-test-document-number]";
const DOCUMENT_OWNER_NAME = "[data-test-document-owner-name]";
const DOCUMENT_OWNER_AVATAR = "[data-test-document-owner-avatar]";
const DOCUMENT_STATUS = "[data-test-document-status]";
const DOCUMENT_TYPE = "[data-test-document-type]";

const FALLBACK_RELATED_LINK = "[data-test-add-fallback-external-resource]";
const FALLBACK_RELATED_LINK_TITLE_INPUT = `${FALLBACK_RELATED_LINK} [data-test-title-input]`;
const FALLBACK_RELATED_LINK_SUBMIT_BUTTON = `${FALLBACK_RELATED_LINK} [data-test-submit-button]`;

const EXTERNAL_LINK = "[data-test-related-link]";

const STATUS_TOGGLE = "[data-test-project-status-toggle]";
const COPY_URL_BUTTON = "[data-test-copy-url-button]";

const ADD_JIRA_BUTTON = "[data-test-add-jira-button]";
const ADD_JIRA_INPUT = "[data-test-add-jira-input]";
const JIRA_PICKER_RESULT = "[data-test-jira-picker-result]";
const JIRA_ISSUE_TYPE_ICON = "[data-test-jira-issue-type-icon]";

const JIRA_OVERFLOW_BUTTON = "[data-test-jira-overflow-button]";
const JIRA_LINK = "[data-test-jira-link]";
const JIRA_PRIORITY_ICON = "[data-test-jira-priority-icon]";
const JIRA_ASSIGNEE_AVATAR = "[data-test-jira-assignee-avatar-wrapper] img";
const JIRA_STATUS = "[data-test-jira-status]";
const JIRA_TYPE_ICON = "[data-test-jira-issue-type-icon]";
const JIRA_KEY = "[data-test-jira-key]";
const JIRA_SUMMARY = "[data-test-jira-summary]";
const JIRA_REMOVE_BUTTON = "[data-test-remove-button]";

const ACTIVE_STATUS_ACTION = "[data-test-status-action='active']";
const COMPLETED_STATUS_ACTION = "[data-test-status-action='completed']";
const ARCHIVED_STATUS_ACTION = "[data-test-status-action='archived']";

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
      id: 1,
      title: "Test Project",
    });
  });

  test("the page title is correct", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/1");
    assert.equal(getPageTitle(), "Test Project | Hermes");
  });

  test("it renders correct empty state", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    let project = this.server.schema.projects.first();

    project.update({
      jiraIssue: undefined,
      hermesDocuments: undefined,
    });

    project = project.attrs;

    await visit("/projects/1");

    assert.dom(TITLE).hasText("Test Project");
    assert.dom(DESCRIPTION).hasText("Add a description");

    assert.dom(ADD_JIRA_BUTTON).exists();

    assert.dom(DOCUMENTS_HEADER).doesNotExist();
    assert.dom(DOCUMENT_LIST).doesNotExist();

    assert.dom(EXTERNAL_LINKS_HEADER).doesNotExist();
    assert.dom(EXTERNAL_LINK_LIST).doesNotExist();

    assert.dom(EMPTY_BODY).exists();
  });

  test("it renders the correct filled-in state", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    MockDate.set(DEFAULT_MOCK_DATE);

    const docTitle = "Foo bar";
    const docSummary = "Baz qux";
    const docStatus = "Approved";
    const docType = "PRD";
    const docNumber = "LAB-023";
    const docOwner = "foo@bar.com";
    const docOwnerPhotoURL = "#foo";
    const docProduct = "Terraform";
    const id = 250;

    this.server.create("related-hermes-document", {
      id,
      googleFileID: id,
      sortOrder: 1,
      title: docTitle,
      documentType: docType,
      documentNumber: docNumber,
      products: [docProduct],
      summary: docSummary,
      owners: [docOwner],
      ownerPhotos: [docOwnerPhotoURL],
      status: docStatus,
    });

    const relatedDocument =
      this.server.schema.relatedHermesDocument.find(id).attrs;

    const externalLinkName = "Foo";
    const externalLinkURL = "https://hashicorp.com";

    this.server.create("related-external-link", {
      name: externalLinkName,
      url: externalLinkURL,
    });

    const externalLink = this.server.schema.relatedExternalLinks.first().attrs;

    const project = this.server.schema.projects.first();

    const projectTitle = "Test Project Title";
    const projectDescription = "Test project description";
    const projectStatus: ProjectStatus = ProjectStatus.Active;
    const projectStatusLabel =
      projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1);

    const jiraKey = "HER-123";

    this.server.create("jira-issue", {
      key: jiraKey,
    });

    project.update({
      title: projectTitle,
      description: projectDescription,
      status: projectStatus,
      hermesDocuments: [relatedDocument],
      externalLinks: [externalLink],
      jiraIssueID: jiraKey,
    });

    // Populate the related resources modal
    this.server.createList("document", 4);

    await visit("/projects/1");

    assert
      .dom(COPY_URL_BUTTON)
      .hasAttribute("data-test-url", window.location.href);

    assert.dom(DOCUMENT_LINK).hasAttribute("href", `/document/${id}`);

    assert.dom(DOCUMENT_TITLE).containsText(docTitle);

    assert.dom(DOCUMENT_NUMBER).containsText(docNumber);
    assert.dom(DOCUMENT_SUMMARY).containsText(docSummary);

    assert
      .dom(DOCUMENT_OWNER_AVATAR)
      .hasAttribute("href", "/documents?owners=%5B%22foo%40bar.com%22%5D");

    assert
      .dom(DOCUMENT_OWNER_NAME)
      .containsText(docOwner)
      .hasAttribute("href", "/documents?owners=%5B%22foo%40bar.com%22%5D");

    assert.dom(DOCUMENT_TYPE).containsText(docType);

    assert.dom(DOCUMENT_STATUS).containsText(docStatus);

    assert
      .dom(EXTERNAL_LINK)
      .containsText(externalLinkName)
      .hasAttribute("href", externalLinkURL);

    assert.dom(ADD_RESOURCE_BUTTON).exists();
    assert.dom(COPY_URL_BUTTON).exists();

    assert.dom(STATUS_TOGGLE).hasText(projectStatusLabel);

    assert.dom(JIRA_LINK).hasAttribute("href", TEST_JIRA_ISSUE_URL);
    assert.dom(JIRA_KEY).hasText(jiraKey);
    assert.dom(JIRA_SUMMARY).hasText(TEST_JIRA_ISSUE_SUMMARY);
    assert.dom(JIRA_STATUS).hasText(TEST_JIRA_ISSUE_STATUS);
    assert.dom(JIRA_TYPE_ICON).exists();
    assert.dom(JIRA_PRIORITY_ICON).exists();

    assert.dom(JIRA_ASSIGNEE_AVATAR).hasAttribute("alt", TEST_JIRA_ASSIGNEE);

    assert.dom(JIRA_OVERFLOW_BUTTON).exists();

    assert
      .dom(CREATED_TIME)
      .hasText(`Created 32 years ago by ${TEST_USER_EMAIL}`);
    assert.dom(MODIFIED_TIME).hasText(`Last modified 32 years ago`);

    MockDate.reset();
  });

  test("you can edit a project title", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/1");

    assert.dom(TITLE).hasText("Test Project");

    await click(TITLE_BUTTON);
    await fillIn(TITLE_INPUT, "New Project Title");
    await click(SAVE_EDITABLE_FIELD_BUTTON);

    assert.dom(TITLE).hasText("New Project Title");

    const project = this.server.schema.projects.first().attrs;

    assert.equal(project.title, "New Project Title");
  });

  test("you can edit a project description", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/1");

    assert.dom(DESCRIPTION).hasText("Add a description");

    await click(DESCRIPTION_BUTTON);
    await fillIn(DESCRIPTION_INPUT, "Foo");
    await click(SAVE_EDITABLE_FIELD_BUTTON);

    assert.dom(DESCRIPTION).hasText("Foo");

    const project = this.server.schema.projects.first().attrs;
    assert.equal(project.description, "Foo");
  });

  test("you can add a document to a project", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    this.server.create("document");

    const project = this.server.schema.projects.first();

    project.update({
      hermesDocuments: [],
    });

    await visit("/projects/1");

    assert.dom(DOCUMENTS_HEADER).doesNotExist();

    await click(ADD_RESOURCE_BUTTON);

    await waitFor(ADD_PROJECT_RESOURCE_MODAL);
    assert.dom(ADD_PROJECT_RESOURCE_MODAL).exists();

    const clickPromise = click(ADD_DOCUMENT_OPTION);

    await waitFor(`${DOCUMENT_OWNER_AVATAR} [data-test-is-loading]`);

    await clickPromise;

    assert.dom("[data-test-is-loading]").doesNotExist();
    assert
      .dom(`${DOCUMENT_OWNER_AVATAR} img`)
      .hasAttribute("src", TEST_USER_PHOTO);

    assert.dom(ADD_PROJECT_RESOURCE_MODAL).doesNotExist();

    assert.dom(DOCUMENTS_HEADER).exists();
    assert.dom(DOCUMENT_COUNT).containsText("1");
    assert.dom(DOCUMENT_LIST_ITEM).exists({ count: 1 });

    const projectDocuments =
      this.server.schema.projects.first().attrs.hermesDocuments;

    assert.equal(projectDocuments.length, 1);
  });

  test("you can remove a document from a project", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/1");

    assert.dom(DOCUMENT_LIST_ITEM).exists({ count: 1 });

    await click(OVERFLOW_MENU_BUTTON);
    await click(OVERFLOW_MENU_REMOVE);

    assert.dom(DOCUMENT_LIST_ITEM).doesNotExist();

    const projectDocuments =
      this.server.schema.projects.first().attrs.hermesDocuments;

    assert.equal(projectDocuments.length, 0);
  });

  test("you can add external links to a project", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    const project = this.server.schema.projects.first();

    const linkTitle = "Foo";
    const linkURL = "https://foo.com";

    project.update({
      externalLinks: [],
    });

    await visit("/projects/1");

    assert.dom(EXTERNAL_LINK).doesNotExist();

    await click(ADD_RESOURCE_BUTTON);

    assert.dom(ADD_PROJECT_RESOURCE_MODAL).exists();

    await fillIn(MODAL_SEARCH_INPUT, linkURL);

    await waitFor(FALLBACK_RELATED_LINK_TITLE_INPUT);

    await fillIn(FALLBACK_RELATED_LINK_TITLE_INPUT, linkTitle);

    await click(FALLBACK_RELATED_LINK_SUBMIT_BUTTON);

    assert.dom(RELATED_LINK_MODAL).doesNotExist();

    assert.dom(EXTERNAL_LINKS_HEADER).exists();
    assert.dom(EXTERNAL_LINK_COUNT).containsText("1");
    assert.dom(EXTERNAL_LINK).exists({ count: 1 });

    assert.dom(EXTERNAL_LINK).containsText(linkTitle);
    assert.dom(EXTERNAL_LINK).containsText(linkURL);
    assert.dom(EXTERNAL_LINK).hasAttribute("href", linkURL);
  });

  test("you can edit a project's external links", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    const project = this.server.schema.projects.first();

    this.server.create("related-external-link", {
      name: "Foo",
      url: "https://foo.com",
    });

    const externalLink = this.server.schema.relatedExternalLinks.first().attrs;

    project.update({
      // Remove docs for easier targeting
      hermesDocuments: [],
      externalLinks: [externalLink],
    });

    await visit("/projects/1");

    assert.dom(EXTERNAL_LINK).exists({ count: 1 });

    await click(OVERFLOW_MENU_BUTTON);
    await click(OVERFLOW_MENU_EDIT);

    const linkTitle = "Bar";
    const linkURL = "https://bar.com";

    await fillIn(RELATED_LINK_TITLE_INPUT, linkTitle);
    await fillIn(RELATED_LINK_URL_INPUT, linkURL);

    await click(RELATED_LINK_SAVE_BUTTON);

    assert.dom(EXTERNAL_LINK).exists({ count: 1 });
    assert.dom(EXTERNAL_LINK).containsText(linkTitle);
    assert.dom(EXTERNAL_LINK).containsText(linkURL);
    assert.dom(EXTERNAL_LINK).hasAttribute("href", linkURL);

    const projectLinks =
      this.server.schema.projects.first().attrs.externalLinks;

    const projectLink = projectLinks[0];

    assert.equal(projectLink.name, linkTitle);
    assert.equal(projectLink.url, linkURL);
  });

  test("you can delete a project's external links", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    const project = this.server.schema.projects.first();

    this.server.create("related-external-link", {
      name: "Foo",
      url: "https://foo.com",
    });

    const externalLink = this.server.schema.relatedExternalLinks.first().attrs;

    project.update({
      // Remove docs for easier targeting
      hermesDocuments: [],
      externalLinks: [externalLink],
    });

    await visit("/projects/1");

    assert.dom(EXTERNAL_LINK).exists({ count: 1 });

    await click(OVERFLOW_MENU_BUTTON);
    await click(OVERFLOW_MENU_REMOVE);

    assert.dom(EXTERNAL_LINK).doesNotExist();

    const projectLinks =
      this.server.schema.projects.first().attrs.externalLinks;

    assert.equal(projectLinks.length, 0);
  });

  test("you can't save an empty project title", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/1");

    assert.dom(TITLE).hasText("Test Project");

    await click(TITLE_BUTTON);

    await fillIn(TITLE_INPUT, "");
    await click(SAVE_EDITABLE_FIELD_BUTTON);

    assert.dom(TITLE_ERROR).exists();
    assert.dom(TITLE_INPUT).exists("the field remains in edit mode");
  });

  test("you can change a project's status", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    await visit("/projects/1");

    assert.dom(STATUS_TOGGLE).hasText("Active");

    await click(STATUS_TOGGLE);
    await click(COMPLETED_STATUS_ACTION);

    assert.dom(STATUS_TOGGLE).hasText("Completed");

    let project = this.server.schema.projects.first().attrs;

    assert.equal(project.status, ProjectStatus.Completed);

    await click(STATUS_TOGGLE);
    await click(ARCHIVED_STATUS_ACTION);

    assert.dom(STATUS_TOGGLE).hasText("Archived");

    project = this.server.schema.projects.first().attrs;

    assert.equal(project.status, ProjectStatus.Archived);

    await click(STATUS_TOGGLE);
    await click(ACTIVE_STATUS_ACTION);

    assert.dom(STATUS_TOGGLE).hasText("Active");

    project = this.server.schema.projects.first().attrs;

    assert.equal(project.status, ProjectStatus.Active);
  });

  test("a full jira issue will load if the project has a jiraIssueID", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    const jiraIssueID = "HER-123";

    this.server.create("project", {
      jiraIssueID,
      id: 2,
    });

    this.server.create("jira-issue", {
      key: jiraIssueID,
    });

    await visit("/projects/2");

    assert.dom(JIRA_LINK).hasAttribute("href", TEST_JIRA_ISSUE_URL);

    assert.dom(JIRA_KEY).hasText(jiraIssueID);
    assert.dom(JIRA_SUMMARY).hasText(TEST_JIRA_ISSUE_SUMMARY);
    assert.dom(JIRA_STATUS).hasText(TEST_JIRA_ISSUE_STATUS);
    assert
      .dom(JIRA_ASSIGNEE_AVATAR)
      .hasAttribute("alt", TEST_JIRA_ASSIGNEE)
      .hasAttribute("src", TEST_JIRA_ASSIGNEE_AVATAR);
    assert
      .dom(JIRA_PRIORITY_ICON)
      .hasAttribute("src", TEST_JIRA_WORKSPACE_URL + TEST_JIRA_PRIORITY_IMAGE)
      .hasAttribute("alt", TEST_JIRA_PRIORITY);
  });

  test("you can add a jira link", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    this.server.create("jira-issue");
    this.server.create("jira-picker-result");

    await visit("/projects/1");

    await click(ADD_JIRA_BUTTON);
    await fillIn(ADD_JIRA_INPUT, TEST_JIRA_ISSUE_SUMMARY);
    await click(JIRA_PICKER_RESULT);

    assert.dom(JIRA_LINK).hasAttribute("href", TEST_JIRA_ISSUE_URL);
    assert.dom(JIRA_ISSUE_TYPE_ICON).exists();
    assert.dom(JIRA_KEY).exists();
    assert.dom(JIRA_SUMMARY).exists();
    assert.dom(JIRA_ASSIGNEE_AVATAR).exists();
    assert.dom(JIRA_PRIORITY_ICON).exists();
    assert.dom(JIRA_STATUS).exists();
  });

  test("you can remove a jira link", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    this.server.create("jira-issue", {
      key: "HER-123",
    });

    this.server.create("jira-picker-result", {
      key: "HER-123",
    });

    this.server.create("project", {
      id: 2,
      jiraIssueID: "HER-123",
    });

    await visit("/projects/2");

    assert.dom(JIRA_LINK).exists();

    await click(JIRA_OVERFLOW_BUTTON);
    await click(JIRA_REMOVE_BUTTON);

    assert.dom(JIRA_LINK).doesNotExist();

    assert.equal(
      this.server.schema.projects.first().attrs.jiraIssueID,
      undefined,
    );
  });
});
