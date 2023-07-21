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

    // Reviewed
    this.set("state", "Reviewed");

    assert.dom(".doc-state--reviewed").exists();
    assert.dom(".hds-badge--color-success").hasText("Reviewed");

    // Obsolete
    this.set("state", "Obsolete");
    assert.dom(".doc-state--obsolete").exists();
    assert.dom(".hds-badge--color-neutral").hasText("Obsolete");

    // Draft
    this.set("state", "any text");
    assert.dom(".doc-state--draft").exists();
    assert.dom(".hds-badge--color-neutral").hasText("Draft");

    this.set("state", undefined);
    assert.dom(".hds-badge--color-neutral").hasText("Draft");

    this.set("state", null);
    assert.dom(".hds-badge--color-neutral").hasText("Draft");

    this.set("state", true);
    assert.dom(".hds-badge--color-neutral").hasText("Draft");
  });
});
