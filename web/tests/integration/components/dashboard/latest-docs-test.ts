import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render, waitFor } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import LatestDocsService from "hermes/services/latest-docs";
import ActiveFiltersService from "hermes/services/active-filters";

const NO_DOCS_PUBLISHED = "[data-test-no-docs-published]";
const LATEST_DOC = "[data-test-latest-doc]";
const ALL_DOCS_LINK = "[data-test-link-to-all-docs]";
const RUNNING_ICON = "[data-test-running-icon]";

interface Context extends MirageTestContext {}

module("Integration | Component | dashboard/latest-docs", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("if the latest docs is empty, it shows a message", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Dashboard::LatestDocs />
    `);

    assert.dom(NO_DOCS_PUBLISHED).exists();
  });

  test("it lists the latest docs", async function (this: Context, assert) {
    const numberOfDocs = 9;

    this.server.createList("document", numberOfDocs);

    const latestDocs = this.owner.lookup(
      "service:latest-docs",
    ) as LatestDocsService;

    latestDocs.index = this.server.schema.document.all().models;

    await render<Context>(hbs`
      <Dashboard::LatestDocs />
    `);

    assert.dom(LATEST_DOC).exists({ count: numberOfDocs });
  });

  test("it shows a link to the next page of docs if there are more than one page", async function (this: Context, assert) {
    this.server.createList("document", 10);

    const activeFilters = this.owner.lookup(
      "service:active-filters",
    ) as ActiveFiltersService;

    activeFilters.update({
      product: ["Labs"],
    });

    const latestDocs = this.owner.lookup(
      "service:latest-docs",
    ) as LatestDocsService;

    latestDocs.index = this.server.schema.document.all().models;
    latestDocs.nbPages = 2;

    await render<Context>(hbs`
      <Dashboard::LatestDocs />
    `);

    assert
      .dom(ALL_DOCS_LINK)
      .hasAttribute(
        "href",
        "/documents?page=2",
        "it links to a filter-less second page of docs",
      );
  });

  test("it shows an icon when the fetch task is running", async function (this: Context, assert) {
    this.server.createList("document", 9);

    const latestDocs = this.owner.lookup(
      "service:latest-docs",
    ) as LatestDocsService;

    await render<Context>(hbs`
      <Dashboard::LatestDocs />
    `);

    assert.dom(RUNNING_ICON).doesNotExist();

    const fetchPromise = latestDocs.fetchAll.perform();

    await waitFor(RUNNING_ICON);
    await fetchPromise;
  });
});
