import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { ProjectStatus } from "hermes/types/project-status";
import { module, test } from "qunit";

const ICON = "[data-test-project-status-icon]";

interface Context extends TestContext {
  status: `${ProjectStatus}`;
}

module("Integration | Component | project/status-icon", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders the correct icon based on status", async function (assert) {
    this.set("status", ProjectStatus.Active);

    await render<Context>(hbs`
      <Project::StatusIcon @status={{this.status}} />
    `);

    assert.dom(ICON).hasAttribute("data-test-status", ProjectStatus.Active);

    this.set("status", ProjectStatus.Completed);

    assert.dom(ICON).hasAttribute("data-test-status", ProjectStatus.Completed);

    this.set("status", ProjectStatus.Archived);

    assert.dom(ICON).hasAttribute("data-test-status", ProjectStatus.Archived);
  });
});
