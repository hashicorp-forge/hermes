import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import { setupMirage } from "ember-cli-mirage/test-support";
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";

const LINK = "[data-test-active-filter-link]";

interface Context extends TestContext {
  filter: string;
}

module(
  "Integration | Component | header/active-filter-list-item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupWindowMock(hooks);
    setupMirage(hooks);

    test("it capitalizes project statuses", async function (this: Context, assert) {
      this.set("filter", ProjectStatus.Active);

      await render<Context>(
        hbs`<Header::ActiveFilterListItem @filter={{this.filter}} />`,
      );

      assert
        .dom(LINK)
        .hasText(projectStatusObjects[ProjectStatus.Active].label);

      this.set("filter", ProjectStatus.Completed);

      assert
        .dom(LINK)
        .hasText(projectStatusObjects[ProjectStatus.Completed].label);

      this.set("filter", ProjectStatus.Archived);

      assert
        .dom(LINK)
        .hasText(projectStatusObjects[ProjectStatus.Archived].label);

      this.set("filter", "foo");

      assert
        .dom(LINK)
        .hasText("foo", "non-project statuses are returned as is");
    });
  },
);
