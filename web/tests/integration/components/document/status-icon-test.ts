import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const STATUS_ICON = "[data-test-document-status-icon]";
const DEFAULT_PAGE_FILL = "[data-test-default-page-fill]";
const DEFAULT_PAGE_STROKE = "[data-test-default-page-stroke]";
const OBSOLETE_PAGE_FILL = "[data-test-obsolete-page-fill]";
const OBSOLETE_FOLDER_FILL = "[data-test-obsolete-folder-fill]";
const OBSOLETE_PAGE_STROKE = "[data-test-obsolete-page-stroke]";
const APPROVED_PAGE_STROKE = "[data-test-approved-page-stroke]";
const PENCIL_ICON = "[data-test-pencil-icon]";
const CHECKMARK_ICON = "[data-test-checkmark-icon]";

interface Context extends TestContext {
  status: string;
}

module("Integration | Component | document/status-icon", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly based on status", async function (assert) {
    let status = "WIP";
    this.set("status", status);

    await render<Context>(
      hbs`<Document::StatusIcon @status={{this.status}} />`,
    );

    assert.dom(STATUS_ICON).hasAttribute("data-test-status", status);
    assert.dom(DEFAULT_PAGE_FILL).exists();
    assert.dom(DEFAULT_PAGE_STROKE).exists();
    assert.dom(PENCIL_ICON).exists("a pencil icon is shown for drafts");

    status = "In-Review";
    this.set("status", status);

    assert.dom(STATUS_ICON).hasAttribute("data-test-status", status);
    assert.dom(DEFAULT_PAGE_FILL).exists();
    assert.dom(DEFAULT_PAGE_STROKE).exists();
    assert
      .dom(PENCIL_ICON)
      .doesNotExist("the pencil is removed when the draft is published");

    status = "Approved";
    this.set("status", status);

    assert.dom(STATUS_ICON).hasAttribute("data-test-status", status);
    assert.dom(DEFAULT_PAGE_FILL).exists();
    assert
      .dom(APPROVED_PAGE_STROKE)
      .exists("the approved state has a custom page stroke");
    assert.dom(CHECKMARK_ICON).exists("checkmark is shown");

    status = "Obsolete";
    this.set("status", status);

    assert.dom(STATUS_ICON).hasAttribute("data-test-status", status);
    assert
      .dom(DEFAULT_PAGE_FILL)
      .doesNotExist("the default page fill is not visible");
    assert
      .dom(OBSOLETE_PAGE_FILL)
      .exists("the obsolete state has a custom fill");
    assert
      .dom(OBSOLETE_FOLDER_FILL)
      .exists("the obsolete state has a folder fill");
    assert
      .dom(OBSOLETE_PAGE_STROKE)
      .exists("the obsolete state has a custom page stroke");

    status = "Non-Standard";
    this.set("status", status);

    assert.dom(DEFAULT_PAGE_FILL).exists();
    assert.dom(DEFAULT_PAGE_STROKE).exists();
  });
});
