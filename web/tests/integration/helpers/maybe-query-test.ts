import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface MaybeQueryTestContext extends TestContext {
  query?: Record<string, unknown>;
}

module("Integration | Helper | maybe-query", function (hooks) {
  setupRenderingTest(hooks);

  test("it accepts a valid query object", async function (this: MaybeQueryTestContext, assert) {
    this.query = { product: ["waypoint"] };

    await render<MaybeQueryTestContext>(hbs`
      <LinkTo
        @route="authenticated.all"
        @query={{maybe-query this.query}}
      >
       Link
      </LinkTo>
    `);

    assert.equal(
      find("a")?.getAttribute("href"),
      "/all?product=%5B%22waypoint%22%5D",
      "the passed-in query is used"
    );
  });

  test("it accepts an undefined query", async function (this: MaybeQueryTestContext, assert) {
    this.query = undefined;

    await render<MaybeQueryTestContext>(hbs`
      <LinkTo
        @route="authenticated.all"
        @query={{maybe-query this.query}}
      >
        Link
      </LinkTo>
    `);

    assert.equal(find("a")?.getAttribute("href"), "/all");
  });
});
