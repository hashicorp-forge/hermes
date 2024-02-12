import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { HdsBadgeType } from "hds/_shared";

interface Context extends TestContext {
  hideProgress: boolean;
  status: string;
  type: HdsBadgeType;
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

  test('it takes a "type" argument', async function (assert) {
    this.set("type", undefined);

    const filled = ".hds-badge--type-filled";
    const inverted = ".hds-badge--type-inverted";

    await render<Context>(hbs`
      <Doc::Status @type={{this.type}} />
    `);

    // By default, the badge type is "filled"
    assert.dom(filled).exists();
    assert.dom(inverted).doesNotExist();

    this.set("type", "inverted");

    assert.dom(filled).doesNotExist();
    assert.dom(inverted).exists();
  });
});
