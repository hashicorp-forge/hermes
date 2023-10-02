import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("Integration | Component | empty-state-text", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    await render(hbs`
      <EmptyStateText data-test-one />
      <EmptyStateText data-test-two @value="foo" />
    `);

    assert.dom("[data-test-one]").hasText("None");
    assert.dom("[data-test-two]").hasText("foo");
  });
});
