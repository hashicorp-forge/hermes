import { log, module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, find, render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { pushMirageIntoStore } from "hermes/mirage/utils";

interface Context extends MirageTestContext {
  email: string;
}

module("Integration | Helper | get-model-attr", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("it returns a model attribute", async function (this: Context, assert) {
    const name = "foo";
    const email = "bar@hashicorp.com";

    this.server.create("person", {
      id: "1",
      name,
      email,
    });

    pushMirageIntoStore(this);

    await render<Context>(hbs`
      <div class="name">
        {{or (get-model-attr "person.name" "1")}}
      </div>
      <div class="email">
        {{get-model-attr "person.email" "1"}}
      </div>
      <div class="non-model-attr">
        {{or (get-model-attr "person.nonModelAttr" "1") "Fallback"}}
      </div>
    `);

    assert.dom(".name").hasText(name);
    assert.dom(".email").hasText(email);

    assert
      .dom(".non-model-attr")
      .hasText("Fallback", "it returns undefined for invalid attributes");
  });

  test("you can specify a fallback", async function (this: Context, assert) {
    const groupName = "bar";
    const personName = "baz";
    const email = `${groupName}@hashicorp.com`;

    this.server.create("group", {
      id: email,
      name: groupName,
      email,
    });

    pushMirageIntoStore(this);

    this.set("email", email);

    await render<Context>(hbs`
      <div class="name">
        {{get-model-attr "person.name" this.email fallback="group.name"}}
      </div>
    `);

    assert
      .dom(".name")
      .hasText(
        groupName,
        "it didn't find a person match but it found a group match",
      );

    this.server.create("person", {
      id: email,
      name: personName,
      email,
      imgURL: undefined,
    });

    this.server.create("google/person", {
      id: email,
    });

    pushMirageIntoStore(this);

    /**
     * The `rerender` method doesn't work with this helper
     * so we `render` the template instead.
     */

    await render<Context>(hbs`
      <div class="name">
        {{get-model-attr "person.name" this.email fallback="group.name"}}
      </div>
    `);

    assert.dom(".name").hasText(personName, "it found a person match");
  });
});
