import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import {
  COLOR_BG_ACTIVE,
  COLOR_BG_ARCHIVED,
  COLOR_BG_COMPLETED,
  COLOR_ICON_ACTIVE,
  COLOR_ICON_COMPLETED,
  COLOR_OUTLINE_ACTIVE,
  COLOR_OUTLINE_ARCHIVED,
  COLOR_OUTLINE_COMPLETED,
  ProjectStatus,
} from "hermes/types/project-status";
import { module, test } from "qunit";

const ICON = "[data-test-project-status-icon]";
const BACKGROUND = "[data-test-background]";
const OUTLINE = "[data-test-outline]";
const ACTIVE_AFFORDANCE = "[data-test-active-affordance]";
const COMPLETED_AFFORDANCE = "[data-test-completed-affordance]";
const ARCHIVED_AFFORDANCE = "[data-test-archived-affordance]";

interface Context extends TestContext {
  status: `${ProjectStatus}`;
}

module("Integration | Component | project/status-icon", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly based on status", async function (assert) {
    this.set("status", ProjectStatus.Active);

    await render<Context>(hbs`
      <Project::StatusIcon @status={{this.status}} />
    `);

    assert.dom(ICON).hasAttribute("data-test-status", ProjectStatus.Active);

    assert.dom(BACKGROUND).hasAttribute("data-test-color", COLOR_BG_ACTIVE);
    assert.dom(OUTLINE).hasAttribute("data-test-color", COLOR_OUTLINE_ACTIVE);
    assert
      .dom(ACTIVE_AFFORDANCE)
      .hasAttribute("data-test-color", COLOR_ICON_ACTIVE);

    this.set("status", ProjectStatus.Completed);

    assert.dom(ICON).hasAttribute("data-test-status", ProjectStatus.Completed);

    assert.dom(BACKGROUND).hasAttribute("data-test-color", COLOR_BG_COMPLETED);
    assert
      .dom(OUTLINE)
      .hasAttribute("data-test-color", COLOR_OUTLINE_COMPLETED);
    assert
      .dom(COMPLETED_AFFORDANCE)
      .hasAttribute("data-test-color", COLOR_ICON_COMPLETED);

    this.set("status", ProjectStatus.Archived);

    assert.dom(ICON).hasAttribute("data-test-status", ProjectStatus.Archived);

    assert.dom(BACKGROUND).hasAttribute("data-test-color", COLOR_BG_ARCHIVED);
    assert.dom(OUTLINE).hasAttribute("data-test-color", COLOR_OUTLINE_ARCHIVED);
    assert
      .dom(ARCHIVED_AFFORDANCE)
      .hasAttribute("data-test-color", COLOR_OUTLINE_ARCHIVED);
  });
});
