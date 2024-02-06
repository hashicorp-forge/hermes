import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface Context extends TestContext {
  hideProgress: boolean;
  status: string;
}

module("Integration | Component | doc/status", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly for every status", async function (assert) {
    this.set("hideProgress", false);
    this.set("status", "In review");

    await render<Context>(hbs`
      <Doc::Status
        @hideProgress={{this.hideProgress}}
        @status={{this.status}}
      />
    `);

    // In Review
    assert.dom(".doc-status--in-review").exists();
    assert.dom(".hds-badge--color-highlight").hasText("In review");

    // Approved
    this.set("status", "Approved");

    assert.dom(".doc-status--approved").exists();
    assert.dom(".hds-badge--color-success").hasText("Approved");

    // Obsolete
    this.set("status", "Obsolete");
    assert.dom(".doc-status--obsolete").exists();
    assert.dom(".hds-badge--color-neutral").hasText("Obsolete");

    // WIP
    this.set("status", "any text");
    assert.dom(".doc-status--wip").exists();
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("status", undefined);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("status", null);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("status", true);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");
  });
});
