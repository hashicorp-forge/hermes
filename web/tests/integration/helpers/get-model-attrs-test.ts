import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { pushMirageIntoStore } from "hermes/mirage/utils";

interface Context extends MirageTestContext {}

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
});
