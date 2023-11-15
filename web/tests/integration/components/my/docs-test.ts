import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

interface MyDocsComponentTestContext extends MirageTestContext {}

module("Integration | Component | my/docs", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("there is a owner filter", async function (this: MyDocsComponentTestContext, assert) {});

  test("a blank state is shown when there are no docs", async function (this: MyDocsComponentTestContext, assert) {});

  test("pagination is conditionally shown", async function (this: MyDocsComponentTestContext, assert) {});

  test("a table of document groups is rendered", async function (this: MyDocsComponentTestContext, assert) {});

  test("the sortable headers have the correct hrefs", async function (this: MyDocsComponentTestContext, assert) {});
});
