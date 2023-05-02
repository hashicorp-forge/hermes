import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | doc/state", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly for every state", async function (assert) {
    this.set("hideProgress", false);
    this.set("state", "In review");

    await render(hbs`
      <Doc::State
        @hideProgress={{this.hideProgress}}
        @state={{this.state}}
      />
    `);

    // In Review
    assert.dom(".doc-state--in-review").exists();
    assert.dom(".hds-badge--color-highlight").hasText("In review");

    // Approved
    this.set("state", "Approved");

    assert.dom(".doc-state--approved").exists();
    assert.dom(".hds-badge--color-success").hasText("Approved");

    // Obsolete
    this.set("state", "Obsolete");
    assert.dom(".doc-state--obsolete").exists();
    assert.dom(".hds-badge--color-neutral").hasText("Obsolete");

    // WIP
    this.set("state", "any text");
    assert.dom(".doc-state--wip").exists();
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("state", undefined);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("state", null);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("state", true);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");
  });
});
