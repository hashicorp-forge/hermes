import { findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { HermesDocument } from "hermes/types/document";
import { module, test } from "qunit";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";
import { authenticateTestUser } from "hermes/mirage/utils";
import { SortDirection } from "hermes/components/table/sortable-header";

const PAGINATION = "[data-test-pagination]";
const TABLE_BODY_HEADER = "[data-test-table-body-header]";
const EMPTY_STATE = "[data-test-my-docs-empty-state]";

interface MyDocsComponentTestContext extends MirageTestContext {
  docs: HermesDocument[];
  nbPages: number;
  sortDirection: `${SortDirection}`;
}

module("Integration | Component | my/docs", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: MyDocsComponentTestContext) {
    authenticateTestUser(this);
  });

  test("a blank state is shown when there are no docs", async function (this: MyDocsComponentTestContext, assert) {
    this.set("docs", []);

    await render<MyDocsComponentTestContext>(hbs`
      <My::Docs
        @docs={{this.docs}}
        @sortDirection="desc"
        @currentPage={{1}}
        @nbPages={{1}}
        @includeSharedDrafts={{false}}
      />
    `);

    assert.dom(EMPTY_STATE).hasText("You don't have any docs yet.");
  });

  test("pagination is conditionally shown", async function (this: MyDocsComponentTestContext, assert) {
    // The component requires at least one document to render the table
    this.server.createList("document", 1);
    this.set("docs", this.server.schema.document.all().models);

    this.set("nbPages", 2);

    await render<MyDocsComponentTestContext>(hbs`
      <My::Docs
        @docs={{this.docs}}
        @sortDirection="desc"
        @currentPage={{1}}
        @nbPages={{this.nbPages}}
        @includeSharedDrafts={{false}}
      />
    `);

    assert.dom(PAGINATION).exists();

    this.set("nbPages", 1);

    assert.dom(PAGINATION).doesNotExist();
  });

  test("documents are conditionally grouped", async function (this: MyDocsComponentTestContext, assert) {
    MockDate.set(DEFAULT_MOCK_DATE);

    const oneHourAgoInSeconds = Date.now() / 1000 - 60 * 60;
    const fortyFiveDaysAgoInSeconds = Date.now() / 1000 - 60 * 60 * 24 * 45;
    const oneHundredDaysAgoInSeconds = Date.now() / 1000 - 60 * 60 * 24 * 100;
    const twoYearsAgoInSeconds = Date.now() / 1000 - 60 * 60 * 24 * 365 * 2;

    this.server.create("document", {
      modifiedTime: oneHourAgoInSeconds,
    });

    this.server.create("document", {
      modifiedTime: fortyFiveDaysAgoInSeconds,
    });

    this.server.create("document", {
      modifiedTime: oneHundredDaysAgoInSeconds,
    });

    this.server.create("document", {
      modifiedTime: twoYearsAgoInSeconds,
    });

    this.set("docs", this.server.schema.document.all().models);

    this.set("sortDirection", "desc");

    await render<MyDocsComponentTestContext>(hbs`
      <My::Docs
        @docs={{this.docs}}
        @sortDirection={{this.sortDirection}}
        @currentPage={{1}}
        @nbPages={{1}}
        @includeSharedDrafts={{false}}
      />
    `);

    assert.dom(TABLE_BODY_HEADER).exists({ count: 4 });

    const expectedHeaderText = [
      "Recently active",
      "More than 30 days old",
      "More than 90 days old",
      "More than 1 year old",
    ];

    const actualHeaderText = findAll(TABLE_BODY_HEADER).map(
      (el) => el.textContent?.trim(),
    );

    assert.deepEqual(actualHeaderText, expectedHeaderText);

    this.set("sortDirection", "asc");

    assert
      .dom(TABLE_BODY_HEADER)
      .doesNotExist(
        'The headers are not shown when the sort direction is "asc"',
      );

    MockDate.reset();
  });
});
