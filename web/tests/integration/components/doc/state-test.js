import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | doc/state", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly for every state", async function (assert) {
    function assertClassNames(selector, classNames) {
      classNames.forEach((className) => {
        assert.dom(selector).hasClass(className);
      });
    }

    let hdsPurple200 = "bg-[color:var(--token-color-palette-purple-200)]";
    let hdsGreen200 = "bg-[color:var(--token-color-palette-green-200)]";
    let hdsBlue200 = "bg-[color:var(--token-color-palette-blue-200)]";

    this.set("hideProgress", false);
    this.set("state", "In review");

    await render(hbs`
      <Doc::State
        @hideProgress={{this.hideProgress}}
        @state={{this.state}}
      />
    `);

    // In Review
    assert.dom(".state--in-review").exists();
    assert.dom(".hds-badge--color-highlight").hasText("In review");

    assert.dom(".h-1").exists({ count: 1 });
    assert.dom(".opacity-75").exists({ count: 1 });

    // Note: Classes with special characters (e.g., "bg-[var(--red)]")
    // are not valid selectors and don't work with `assert.dom()`,
    // so we `getElementsByClassName` instead.

    assert.equal(document.getElementsByClassName(hdsPurple200).length, 2);

    assertClassNames("li:nth-child(1)", [hdsPurple200, "opacity-75"]);
    assertClassNames("li:nth-child(2)", [hdsPurple200, "h-1"]);

    // Approved
    this.set("state", "Approved");
    assert.dom(".state--approved").exists();
    assert.dom(".hds-badge--color-success").hasText("Approved");

    assert.dom(".h-1").exists({ count: 1 });
    assert.dom(".opacity-75").exists({ count: 2 });

    assertClassNames("li:nth-child(1)", [hdsGreen200, "opacity-75"]);
    assertClassNames("li:nth-child(2)", [hdsGreen200, "opacity-75"]);
    assertClassNames("li:nth-child(3)", [hdsGreen200, "h-1"]);

    // Obsolete
    this.set("state", "Obsolete");
    assert.dom(".state--obsolete").exists();
    assert.dom(".hds-badge--color-neutral").hasText("Obsolete");

    assert.dom(".h-1").doesNotExist();
    assert.dom(".opacity-75").doesNotExist();

    // WIP
    this.set("state", "any text");
    assert.dom(".state--wip").exists();
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    assert.dom(".h-1").exists({ count: 1 });
    assert.dom(".opacity-75").doesNotExist();

    assert.equal(document.getElementsByClassName(hdsBlue200).length, 1);

    assertClassNames("li:nth-child(1)", [hdsBlue200, "h-1"]);

    this.set("state", undefined);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("state", null);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");

    this.set("state", true);
    assert.dom(".hds-badge--color-neutral").hasText("WIP");
  });
});
