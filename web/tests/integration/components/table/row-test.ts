import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { TimeColumn } from "hermes/components/table/row";
import { HermesDocument } from "hermes/types/document";
import { authenticateTestUser } from "hermes/mirage/utils";
import { module, test } from "qunit";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";

const TIME_CELL = "[data-test-table-row-time-cell]";

interface TableRowComponentTestContext extends MirageTestContext {
  doc: HermesDocument;
  timeColumn: `${TimeColumn}`;
}

module("Integration | Component | table/row", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: TableRowComponentTestContext) {
    authenticateTestUser(this);
    MockDate.set(DEFAULT_MOCK_DATE);

    const tenMinutesAgoInSeconds = Date.now() / 1000 - 10 * 60;
    const tenSecondsAgoInSeconds = Date.now() / 1000 - 10;

    this.server.create("document", {
      createdTime: tenMinutesAgoInSeconds,
      modifiedTime: tenSecondsAgoInSeconds,
    });

    this.set("doc", this.server.schema.document.first());
    this.set("timeColumn", TimeColumn.Created);
  });

  hooks.afterEach(function () {
    MockDate.reset();
  });

  test("it renders the correct time value", async function (this: TableRowComponentTestContext, assert) {
    await render<TableRowComponentTestContext>(hbs`
      <Table::Row
        data-test-one
        @doc={{this.doc}}
        @timeColumn="createdTime"
      />

      <Table::Row
        data-test-two
        @doc={{this.doc}}
        @timeColumn="modifiedTime"
      />
    `);

    assert.dom(`[data-test-one] ${TIME_CELL}`).hasText("10 minutes ago");
    assert.dom(`[data-test-two] ${TIME_CELL}`).hasText("10 seconds ago");
  });

  test('it renders "Unknown" as a fallback', async function (this: TableRowComponentTestContext, assert) {
    this.set("doc", this.server.create("document", { createdTime: null }));

    await render<TableRowComponentTestContext>(hbs`
      <Table::Row
        @doc={{this.doc}}
        @timeColumn="createdTime"
      />
    `);

    assert
      .dom(TIME_CELL)
      .hasText("Unknown")
      .hasClass("text-color-foreground-disabled");
  });
});
